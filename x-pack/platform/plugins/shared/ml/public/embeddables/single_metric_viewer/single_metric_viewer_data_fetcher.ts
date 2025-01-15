/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetch$ } from '@kbn/presentation-publishing';
import { type TimefilterContract } from '@kbn/data-plugin/public';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import { combineLatest, BehaviorSubject } from 'rxjs';
import type {
  SingleMetricViewerEmbeddableApi,
  SingleMetricViewerEmbeddableUserInput,
} from '../types';

interface SingleMetricViewerData {
  /**
   * Config data inputted by the user
   */
  singleMetricViewerData: SingleMetricViewerEmbeddableUserInput | undefined;
  /**
   * Current time range bounds
   */
  bounds: TimeRangeBounds | undefined;
  /**
   * Time of last refresh in ms
   */
  lastRefresh: number | undefined;
}

export const initializeSingleMetricViewerDataFetcher = (
  api: SingleMetricViewerEmbeddableApi,
  dataLoading: BehaviorSubject<boolean | undefined>,
  blockingError: BehaviorSubject<Error | undefined>,
  timefilter: TimefilterContract
) => {
  const singleMetricViewerData$ = new BehaviorSubject<SingleMetricViewerData>({
    singleMetricViewerData: undefined,
    bounds: undefined,
    lastRefresh: undefined,
  });

  const singleMetricViewerInput$ = combineLatest({
    jobIds: api.jobIds,
    selectedDetectorIndex: api.selectedDetectorIndex,
    selectedEntities: api.selectedEntities,
    forecastId: api.forecastId,
    functionDescription: api.functionDescription,
  });

  const subscription = combineLatest([singleMetricViewerInput$, fetch$(api)]).subscribe(
    ([singleMetricViewerData, fetchContext]) => {
      let bounds;
      let lastRefresh;
      if (timefilter !== undefined) {
        bounds = timefilter.calculateBounds(
          fetchContext?.timeRange
            ? fetchContext?.timeRange
            : api.timeRange$?.value ?? timefilter.getTime()
        );
        lastRefresh = Date.now();
      }
      singleMetricViewerData$.next({ singleMetricViewerData, bounds, lastRefresh });
    }
  );

  return {
    singleMetricViewerData$,
    onDestroy: () => {
      subscription.unsubscribe();
    },
  };
};
