/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { map } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { TimefilterContract } from '@kbn/data-plugin/public';

type InputTimeRange = Parameters<TimefilterContract['setTime']>[0];

export const useEpisodesTimeRange = (timefilter: TimefilterContract) => {
  const timeRange$ = useMemo(
    () => timefilter.getTimeUpdate$().pipe(map(() => timefilter.getTime())),
    [timefilter]
  );

  const timeRange = useObservable(
    timeRange$,
    timefilter?.getTime() ?? { from: 'now-24h', to: 'now' }
  );

  const handleTimeChange = useCallback(
    (range: InputTimeRange) => {
      timefilter.setTime(range);
    },
    [timefilter]
  );

  return { timeRange, handleTimeChange };
};
