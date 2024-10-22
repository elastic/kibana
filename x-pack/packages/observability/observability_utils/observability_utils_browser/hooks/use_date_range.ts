/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '@kbn/data-plugin/common';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useDateRange({ data }: { data: DataPublicPluginStart }): {
  timeRange: TimeRange;
  absoluteTimeRange: {
    start: number;
    end: number;
  };
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>;
} {
  const timefilter = data.query.timefilter.timefilter;

  const [timeRange, setTimeRange] = useState(() => timefilter.getTime());

  const [absoluteTimeRange, setAbsoluteTimeRange] = useState(() => timefilter.getAbsoluteTime());

  useEffect(() => {
    const timeUpdateSubscription = timefilter.getTimeUpdate$().subscribe({
      next: () => {
        setTimeRange(() => timefilter.getTime());
        setAbsoluteTimeRange(() => timefilter.getAbsoluteTime());
      },
    });

    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  }, [timefilter]);

  const setTimeRangeMemoized: React.Dispatch<React.SetStateAction<TimeRange>> = useCallback(
    (nextOrCallback) => {
      const val =
        typeof nextOrCallback === 'function'
          ? nextOrCallback(timefilter.getTime())
          : nextOrCallback;

      timefilter.setTime(val);
    },
    [timefilter]
  );

  const asEpoch = useMemo(() => {
    return {
      start: new Date(absoluteTimeRange.from).getTime(),
      end: new Date(absoluteTimeRange.to).getTime(),
    };
  }, [absoluteTimeRange]);

  return {
    timeRange,
    absoluteTimeRange: asEpoch,
    setTimeRange: setTimeRangeMemoized,
  };
}
