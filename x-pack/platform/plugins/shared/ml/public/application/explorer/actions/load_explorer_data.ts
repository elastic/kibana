/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';

import type { Observable } from 'rxjs';
import { of, Subject } from 'rxjs';
import { switchMap, map } from 'rxjs';

import { useCallback, useMemo } from 'react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { useTimefilter } from '@kbn/ml-date-picker';
import type { InfluencersFilterQuery } from '@kbn/ml-anomaly-utils';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { AppStateSelectedCells, ExplorerJob } from '../explorer_utils';
import {
  getSelectionInfluencers,
  getSelectionJobIds,
  getSelectionTimeRange,
} from '../explorer_utils';

import { useMlApi } from '../../contexts/kibana';
import type { MlResultsService } from '../../services/results_service';
import { mlResultsServiceProvider } from '../../services/results_service';
import type { AnomalyExplorerChartsService } from '../../services/anomaly_explorer_charts_service';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';
import type { MlApi } from '../../services/ml_api_service';
import type { ExplorerState } from '../explorer_data';

export interface LoadExplorerDataConfig {
  influencersFilterQuery: InfluencersFilterQuery;
  lastRefresh: number;
  noInfluencersConfigured: boolean;
  selectedCells: AppStateSelectedCells | undefined | null;
  selectedJobs: ExplorerJob[];
  viewBySwimlaneFieldName: string;
}

export const isLoadExplorerDataConfig = (arg: any): arg is LoadExplorerDataConfig => {
  return (
    arg !== undefined &&
    arg.selectedJobs !== undefined &&
    arg.selectedJobs !== null &&
    arg.viewBySwimlaneFieldName !== undefined
  );
};

/**
 * Fetches the data necessary for the Anomaly Explorer using observables.
 */
const loadExplorerDataProvider = (
  mlApi: MlApi,
  mlResultsService: MlResultsService,
  anomalyExplorerChartsService: AnomalyExplorerChartsService,
  timefilter: TimefilterContract
) => {
  return (config: LoadExplorerDataConfig): Observable<Partial<ExplorerState>> => {
    if (!isLoadExplorerDataConfig(config)) {
      return of({});
    }

    const { influencersFilterQuery, selectedCells, selectedJobs, viewBySwimlaneFieldName } = config;

    const selectionInfluencers = getSelectionInfluencers(selectedCells, viewBySwimlaneFieldName);
    const jobIds = getSelectionJobIds(selectedCells, selectedJobs);

    const bounds = timefilter.getBounds() as Required<TimeRangeBounds>;

    const timerange = getSelectionTimeRange(selectedCells, bounds);

    // Fetch only chart records here; influencers are managed by InfluencersStateService
    return anomalyExplorerChartsService
      .loadDataForCharts$(
        jobIds,
        timerange.earliestMs,
        timerange.latestMs,
        selectionInfluencers,
        selectedCells,
        influencersFilterQuery
      )
      .pipe(
        map(() => ({
          loading: false,
          anomalyChartsDataLoading: false,
        }))
      );
  };
};

export const useExplorerData = (): [
  Partial<ExplorerState> | undefined,
  (d: LoadExplorerDataConfig) => void
] => {
  const timefilter = useTimefilter();
  const mlApi = useMlApi();
  const { anomalyExplorerChartsService } = useAnomalyExplorerContext();

  const loadExplorerData = useMemo(() => {
    const mlResultsService = mlResultsServiceProvider(mlApi);

    return loadExplorerDataProvider(
      mlApi,
      mlResultsService,
      anomalyExplorerChartsService,
      timefilter
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExplorerData$ = useMemo(() => new Subject<LoadExplorerDataConfig>(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const explorerData$ = useMemo(() => loadExplorerData$.pipe(switchMap(loadExplorerData)), []);
  const explorerData = useObservable(explorerData$);

  const update = useCallback((c: LoadExplorerDataConfig) => {
    loadExplorerData$.next(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [explorerData, update];
};
