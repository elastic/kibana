/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { fetch$, type RequestCancellationManager } from '@kbn/presentation-publishing';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  map,
  type Observable,
  of,
  shareReplay,
  skipWhile,
  switchMap,
  tap,
} from 'rxjs';
import { SWIMLANE_TYPE } from '@kbn/ml-common-types/embeddables/swimlane_type';
import { ANOMALY_SWIM_LANE_HARD_LIMIT } from '../../../common/constants/explorer';
import type { OverallSwimlaneData } from '../../application/explorer/explorer_utils';
import { CONTROLLED_BY_SWIM_LANE_FILTER } from '../../ui_actions/constants';
import { fromAbortablePromise } from '../common/from_abortable_promise';
import { getJobsObservable } from '../common/get_jobs_observable';
import { processFilters } from '../common/process_filters';
import type { AnomalySwimlaneServices } from '../types';
import type { AnomalySwimLaneEmbeddableApi } from './types';

const FETCH_RESULTS_DEBOUNCE_MS = 500;

export const initializeSwimLaneDataFetcher = (
  swimLaneApi: AnomalySwimLaneEmbeddableApi,
  chartWidth$: Observable<number | undefined>,
  dataLoading$: BehaviorSubject<boolean | undefined>,
  blockingError$: BehaviorSubject<Error | undefined>,
  services: AnomalySwimlaneServices,
  requestCancellationManager: RequestCancellationManager
) => {
  const { anomalyTimelineService, anomalyDetectorService } = services;

  const swimLaneData$ = new BehaviorSubject<OverallSwimlaneData | undefined>(undefined);

  const selectedJobs$ = getJobsObservable(swimLaneApi.jobIds, anomalyDetectorService, (error) => {
    blockingError$.next(error);
  }).pipe(shareReplay(1));

  const swimLaneInput$ = combineLatest({
    jobIds: swimLaneApi.jobIds,
    swimlaneType: swimLaneApi.swimlaneType,
    viewBy: swimLaneApi.viewBy,
    perPage: swimLaneApi.perPage,
    fromPage: swimLaneApi.fromPage,
    severityThreshold: swimLaneApi.severityThreshold,
  });

  const fetchContext$ = fetch$(swimLaneApi).pipe(shareReplay(1));

  const bucketInterval$ = combineLatest([
    selectedJobs$,
    chartWidth$.pipe(distinctUntilChanged()),
    fetchContext$,
  ]).pipe(
    skipWhile(([jobs, width]) => {
      return !Array.isArray(jobs) || !width;
    }),
    tap(([, , fetchContext]) => {
      if (fetchContext.timeRange) {
        anomalyTimelineService.setTimeRange(fetchContext.timeRange);
      }
    }),
    map(([jobs, width]) => anomalyTimelineService.getSwimlaneBucketInterval(jobs!, width!))
  );

  const subscription = combineLatest([
    selectedJobs$,
    swimLaneInput$,
    fetchContext$,
    bucketInterval$,
  ])
    .pipe(
      tap(() => {
        // Starting a new load lifts a previous cancellation. This happens before the debounce so
        // that cancelling while the fetch is still debouncing prevents the requests from starting.
        requestCancellationManager.startLoad();
        dataLoading$.next(true);
      }),
      debounceTime(FETCH_RESULTS_DEBOUNCE_MS),
      switchMap(([explorerJobs, input, fetchContext, bucketInterval]) => {
        const { query, filters } = fetchContext;
        const { signal } = requestCancellationManager;
        if (signal.aborted) {
          // Cancelled before the requests started, `cancelRequests` already cleared the loading state.
          return EMPTY;
        }
        if (!explorerJobs) {
          // couldn't load the list of jobs
          return of(undefined);
        }

        const { viewBy, swimlaneType, perPage, fromPage, severityThreshold } = input;
        const severityThresholds =
          severityThreshold !== undefined ? [{ min: severityThreshold }] : undefined;

        let appliedFilters: estypes.QueryDslQueryContainer;
        try {
          if (filters || query) {
            appliedFilters = processFilters(filters, query, CONTROLLED_BY_SWIM_LANE_FILTER);
          }
        } catch (e) {
          // handle query syntax errors
          blockingError$.next(e);
          return EMPTY;
        }

        return fromAbortablePromise(
          (requestSignal) =>
            anomalyTimelineService.loadOverallData(
              explorerJobs,
              undefined,
              bucketInterval,
              severityThresholds,
              requestSignal
            ),
          signal
        ).pipe(
          switchMap((overallSwimlaneData) => {
            const { earliest, latest } = overallSwimlaneData;

            if (overallSwimlaneData && swimlaneType === SWIMLANE_TYPE.VIEW_BY) {
              const swimLaneLimit = ANOMALY_SWIM_LANE_HARD_LIMIT;

              return fromAbortablePromise(
                (requestSignal) =>
                  anomalyTimelineService.loadViewBySwimlane(
                    [],
                    { earliest, latest },
                    explorerJobs,
                    viewBy!,
                    swimLaneLimit,
                    perPage!,
                    fromPage,
                    undefined,
                    appliedFilters,
                    bucketInterval,
                    severityThresholds,
                    requestSignal
                  ),
                signal
              ).pipe(
                map((viewBySwimlaneData) => {
                  return {
                    ...viewBySwimlaneData!,
                    earliest,
                    latest,
                  };
                })
              );
            }
            return of(overallSwimlaneData);
          }),
          catchError((error) => {
            blockingError$.next(error);
            return EMPTY;
          })
        );
      })
    )
    .subscribe((data) => {
      swimLaneApi.setInterval(data?.interval);

      dataLoading$.next(false);
      blockingError$.next(undefined);
      swimLaneData$.next(data);
    });

  return {
    swimLaneData$,
    onDestroy: () => {
      subscription.unsubscribe();
    },
  };
};
