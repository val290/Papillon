import React, { useEffect, useMemo, useState } from "react";
import Reanimated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { NativeItem, NativeList, NativeListHeader } from "@/components/Global/NativeComponents";
import { useCurrentAccount } from "@/stores/account";
import { useTimetableStore } from "@/stores/timetable";
import { TimetableClass } from "@/services/shared/Timetable";
import { dateToEpochWeekNumber } from "@/utils/epochWeekNumber";
import { PapillonNavigation } from "@/router/refs";
import RedirectButton from "@/components/Home/RedirectButton";
import { updateTimetableForWeekInCache } from "@/services/timetable";
import MissingItem from "@/components/Global/MissingItem";
import { TimetableItem } from "../../Lessons/Atoms/Item";

const TimetableElement = () => {
  const account = useCurrentAccount((store) => store.account!);
  const timetables = useTimetableStore((store) => store.timetables);

  const [nextCourses, setNextCourses] = useState<TimetableClass[]>([]);
  const [hidden, setHidden] = useState(true);
  const [loading, setLoading] = useState(false);
  const currentWeekNumber = useMemo(() => dateToEpochWeekNumber(new Date()), []);

  const isToday = (timestamp: number) => {
    const today = new Date();
    const date = new Date(timestamp);
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const fetchTimetable = async () => {
    if (!timetables[currentWeekNumber] && account.instance) {
      setLoading(true);
      try {
        await updateTimetableForWeekInCache(account, currentWeekNumber);
      } finally {
        setLoading(false);
      }
    }
  };

  const filterAndSortCourses = (weekCourses: TimetableClass[]): TimetableClass[] => {
    const now = Date.now();
    const todayCourses = weekCourses
      .filter(c => isToday(c.startTimestamp) && c.endTimestamp > now)
      .sort((a, b) => a.startTimestamp - b.startTimestamp);

    if (todayCourses.length > 0) {
      return todayCourses;
    }

    return weekCourses
      .filter(c => c.startTimestamp > now)
      .sort((a, b) => a.startTimestamp - b.startTimestamp)
      .slice(0, 3);
  };

  const updateNextCourses = () => {
    if (!account.instance || !timetables[currentWeekNumber]) {
      return;
    }

    const weekCourses = timetables[currentWeekNumber];
    const upcomingCourses = filterAndSortCourses(weekCourses);

    setNextCourses(upcomingCourses);
    setHidden(upcomingCourses.length === 0);
  };

  useEffect(() => {
    fetchTimetable();
  }, [currentWeekNumber, account.instance]);

  useEffect(() => {
    updateNextCourses();
    const intervalId = setInterval(updateNextCourses, 60000);
    return () => clearInterval(intervalId);
  }, [account.instance, timetables, currentWeekNumber]);

  if (loading) {
    return (
      <NativeList
        animated
        key="loadingCourses"
        entering={FadeInDown.springify().mass(1).damping(20).stiffness(300)}
        exiting={FadeOut.duration(300)}
      >
        <NativeItem animated style={{ paddingVertical: 10 }}>
          <MissingItem
            emoji="⏳"
            title="Chargement de l'emploi du temps"
            description="Veuillez patienter..."
          />
        </NativeItem>
      </NativeList>
    );
  }

  if (hidden || nextCourses.length === 0) {
    return (
      <NativeList
        animated
        key="emptyCourses"
        entering={FadeInDown.springify().mass(1).damping(20).stiffness(300)}
        exiting={FadeOut.duration(300)}
      >
        <NativeItem animated style={{ paddingVertical: 10 }}>
          <MissingItem
            emoji="📚"
            title="Aucun cours à venir"
            description="Il n'y a pas de cours à venir pour aujourd'hui."
          />
        </NativeItem>
      </NativeList>
    );
  }

  const label = isToday(nextCourses[0].startTimestamp) ? "Emploi du temps" : "Prochains cours";

  return (
    <>
      <NativeListHeader
        animated
        label={label}
        trailing={<RedirectButton navigation={PapillonNavigation.current} redirect="Lessons" />}
      />
      <Reanimated.View
        layout={LinearTransition}
        style={{ marginTop: 24, gap: 10 }}
      >
        {nextCourses.map((course, index) => (
          <React.Fragment key={course.id || index}>
            <TimetableItem item={course} index={index} small />
          </React.Fragment>
        ))}
      </Reanimated.View>
    </>
  );
};

export default TimetableElement;