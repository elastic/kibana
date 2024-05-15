/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { merge, type Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { useMemo } from 'react';
import { mlTimefilterRefresh$, useTimefilter } from '@kbn/ml-date-picker';
import { annotationsRefresh$ } from '../services/annotations_service';

export interface Refresh {
  lastRefresh: number;
  timeRange?: { start: string; end: string };
}

/**
 * Hook that provides the latest refresh timestamp
 * and the most recent applied time range.
 */
export const useRefresh = () => {
  const timefilter = useTimefilter();

  const getTimeRange = () => {
    const { from, to } = timefilter.getTime();
    return { start: from, end: to };
  };

  const refresh$ = useMemo(() => {
    return merge(
      mlTimefilterRefresh$,
      timefilter.getTimeUpdate$().pipe(
        map(() => {
          return { lastRefresh: Date.now(), timeRange: getTimeRange() };
        })
      ),
      annotationsRefresh$.pipe(map((d) => ({ lastRefresh: d })))
    ) as Observable<Refresh>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useObservable<Refresh>(refresh$);
};
