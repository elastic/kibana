/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useEffect } from 'react';
import { combineLatest, tap, debounceTime, switchMap, skipWhile, of, EMPTY } from 'rxjs';
import { Subject, catchError } from 'rxjs';
import type { InfluencersFilterQuery } from '@kbn/ml-anomaly-utils';
import type { CoreStart } from '@kbn/core/public';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';
import { fetch$, RequestCancellationManager } from '@kbn/presentation-publishing';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type { ErrorType } from '@kbn/ml-error-utils';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import { SWIMLANE_TYPE } from '@kbn/ml-common-types/embeddables/swimlane_type';
import type { AnomalyChartsServices, AnomalyChartsApi } from '..';
import { getJobsObservable } from '../common/get_jobs_observable';
import { OVERALL_LABEL } from '../../application/explorer/explorer_constants';
import { processFilters } from '../common/process_filters';
import type { AppStateSelectedCells } from '../../application/explorer/explorer_utils';
import {
  getSelectionInfluencers,
  getSelectionJobIds,
  getSelectionTimeRange,
} from '../../application/explorer/explorer_utils';
import type { ExplorerChartsData } from '../../application/explorer/explorer_charts/explorer_charts_container_service';
import type { MlStartDependencies } from '../../plugin';
import { takeUntilAborted } from '../../application/util/take_until_aborted';

const FETCH_RESULTS_DEBOUNCE_MS = 500;

export function useAnomalyChartsData(
  api: AnomalyChartsApi,
  services: [CoreStart, MlStartDependencies, AnomalyChartsServices],
  chartWidth: number,
  severity: SeverityThreshold[],
  renderCallbacks: {
    onRenderComplete: () => void;
    onLoading: (v: boolean) => void;
    onError: (error: Error) => void;
  },
  requestCancellationManager?: RequestCancellationManager
): {
  chartsData: ExplorerChartsData | undefined;
  isLoading: boolean;
  error: Error | null | undefined;
} {
  const [, , { anomalyDetectorService, anomalyExplorerService }] = services;

  const [chartsData, setChartsData] = useState<ExplorerChartsData>();
  const [error, setError] = useState<Error | null>();
  const [isLoading, setIsLoading] = useState(false);

  const cancellationManager = useMemo(
    () => requestCancellationManager ?? new RequestCancellationManager(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const chartWidth$ = useMemo(() => new Subject<number>(), []);
  const severity$ = useMemo(() => new Subject<SeverityThreshold[]>(), []);

  useEffect(() => {
    const subscription = combineLatest({
      explorerJobs: getJobsObservable(api.jobIds$, anomalyDetectorService, setError),
      maxSeriesToPlot: api.maxSeriesToPlot$,
      chartWidth: chartWidth$.pipe(skipWhile((v) => !v)),
      severityValue: severity$,
      dataPublishingServices: fetch$(api),
    })
      .pipe(
        tap(() => {
          // Starting a new load lifts a previous cancellation. This happens before the debounce so
          // that cancelling while the fetch is still debouncing prevents the requests from starting.
          cancellationManager.startLoad();
          setIsLoading(true);
        }),
        debounceTime(FETCH_RESULTS_DEBOUNCE_MS),
        tap(() => {
          if (!cancellationManager.signal.aborted) {
            renderCallbacks.onLoading(true);
          }
        }),
        switchMap(
          ({
            explorerJobs,
            maxSeriesToPlot,
            chartWidth: embeddableContainerWidth,
            severityValue,
            dataPublishingServices,
          }) => {
            const { signal } = cancellationManager;
            if (signal.aborted) {
              // Cancelled before the requests started.
              setIsLoading(false);
              return EMPTY;
            }
            const { timeRange: timeRangeInput, filters, query } = dataPublishingServices;
            if (!explorerJobs) {
              // couldn't load the list of jobs
              return of(undefined);
            }

            const viewBySwimlaneFieldName = OVERALL_LABEL;

            if (timeRangeInput) {
              anomalyExplorerService.setTimeRange(timeRangeInput);
            }

            let influencersFilterQuery: InfluencersFilterQuery | undefined;
            try {
              if (filters || query) {
                influencersFilterQuery = processFilters(filters, query);
              }
            } catch (e) {
              // handle query syntax errors
              setError(e);
              return of(undefined);
            }

            const bounds = anomalyExplorerService.getTimeBounds();
            if (bounds.min === undefined || bounds.max === undefined) {
              throw new Error('Unable to load anomaly charts: time range bounds are not defined.');
            }

            // Can be from input time range or from the timefilter bar
            const selections: AppStateSelectedCells = {
              lanes: [OVERALL_LABEL],
              times: [bounds.min.unix(), bounds.max.unix()],
              type: SWIMLANE_TYPE.OVERALL,
            };

            const selectionInfluencers = getSelectionInfluencers(
              selections,
              viewBySwimlaneFieldName
            );

            const jobIds = getSelectionJobIds(selections, explorerJobs);

            const timeRange = getSelectionTimeRange(selections, bounds);

            return anomalyExplorerService
              .getAnomalyData$(
                jobIds,
                embeddableContainerWidth,
                timeRange.earliestMs,
                timeRange.latestMs,
                severityValue,
                influencersFilterQuery,
                selectionInfluencers,
                maxSeriesToPlot
              )
              .pipe(
                // Unsubscribing aborts the in-flight request.
                takeUntilAborted(signal),
                tap({
                  complete: () => {
                    // A replaced request is followed by a new load that manages the loading state.
                    if (signal.aborted && signal.reason !== AbortReason.REPLACED) {
                      setIsLoading(false);
                    }
                  },
                })
              );
          }
        ),
        catchError((e: unknown) => {
          // eslint-disable-next-line no-console
          console.error(`Error occured fetching anomaly charts data for embeddable\n`, e);
          const message = extractErrorMessage(e as ErrorType);
          setError(e instanceof Error ? e : new Error(message));
          setIsLoading(false);
          renderCallbacks.onLoading(false);
          return of(undefined);
        })
      )
      .subscribe((results) => {
        if (results !== undefined) {
          setError(null);
          setChartsData(results);
          setIsLoading(false);
          renderCallbacks.onRenderComplete();
        }
      });

    return () => {
      subscription?.unsubscribe();
      chartWidth$.complete();
      severity$.complete();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chartWidth$.next(chartWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartWidth]);

  useEffect(() => {
    severity$.next(severity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity]);

  useEffect(() => {
    if (error) {
      renderCallbacks.onError(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return { chartsData, isLoading, error };
}
