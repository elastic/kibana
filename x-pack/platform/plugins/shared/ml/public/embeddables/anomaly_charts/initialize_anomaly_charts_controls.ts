/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, map, merge } from 'rxjs';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import type { StateComparators, TitlesApi } from '@kbn/presentation-publishing';
import type { SeverityThreshold } from '../../../common/types/anomalies';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import { DEFAULT_MAX_SERIES_TO_PLOT } from '../../application/services/anomaly_explorer_charts_service';
import type {
  AnomalyChartsComponentApi,
  AnomalyChartsDataLoadingApi,
  AnomalyChartsEmbeddableRuntimeState,
  AnomalyChartsEmbeddableState,
} from '../types';

export const anomalyChartsComparators: StateComparators<AnomalyChartsEmbeddableRuntimeState> = {
  jobIds: 'deepEquality',
  maxSeriesToPlot: 'referenceEquality',
  severityThreshold: 'deepEquality',
  selectedEntities: 'deepEquality',
};

export const initializeAnomalyChartsControls = (
  initialState: AnomalyChartsEmbeddableState,
  titlesApi?: TitlesApi,
  parentApi?: unknown
) => {
  const jobIds$ = new BehaviorSubject<JobId[]>(initialState.jobIds);
  const maxSeriesToPlot$ = new BehaviorSubject<number>(
    initialState.maxSeriesToPlot ?? DEFAULT_MAX_SERIES_TO_PLOT
  );

  const severityThreshold$ = new BehaviorSubject<SeverityThreshold[] | undefined>(
    initialState.severityThreshold
  );
  const selectedEntities$ = new BehaviorSubject<MlEntityField[] | undefined>(
    initialState.selectedEntities
  );
  const interval$ = new BehaviorSubject<number | undefined>(undefined);
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

  const updateUserInput = (update: AnomalyChartsEmbeddableState) => {
    jobIds$.next(update.jobIds);
    maxSeriesToPlot$.next(update.maxSeriesToPlot);
    if (titlesApi) {
      titlesApi.setTitle(update.title);
    }
  };

  const updateSeverityThreshold = (v: SeverityThreshold[]) => severityThreshold$.next(v);
  const updateSelectedEntities = (v: MlEntityField[]) => selectedEntities$.next(v);
  const setInterval = (v: number) => interval$.next(v);

  const getLatestState = (): AnomalyChartsEmbeddableState => {
    return {
      jobIds: jobIds$.value,
      maxSeriesToPlot: maxSeriesToPlot$.value,
      severityThreshold: severityThreshold$.value,
      selectedEntities: selectedEntities$.value,
    };
  };

  const onRenderComplete = () => dataLoading$.next(false);
  const onLoading = (v: boolean) => dataLoading$.next(v);
  const onError = (error?: Error) => blockingError$.next(error);

  return {
    api: {
      jobIds$,
      maxSeriesToPlot$,
      severityThreshold$,
      selectedEntities$,
      updateUserInput,
      updateSeverityThreshold,
      updateSelectedEntities,
    } as AnomalyChartsComponentApi,
    dataLoadingApi: {
      dataLoading$,
      setInterval,
      onRenderComplete,
      onLoading,
      onError,
    } as AnomalyChartsDataLoadingApi,
    anyStateChange$: merge(jobIds$, maxSeriesToPlot$, severityThreshold$, selectedEntities$).pipe(
      map(() => undefined)
    ),
    getLatestState,
    reinitializeState: (lastSavedState: AnomalyChartsEmbeddableState) => {
      jobIds$.next(lastSavedState.jobIds);
      maxSeriesToPlot$.next(lastSavedState.maxSeriesToPlot);
      severityThreshold$.next(lastSavedState.severityThreshold);
      selectedEntities$.next(lastSavedState.selectedEntities);
    },
    cleanup: () => {
      jobIds$.complete();
      maxSeriesToPlot$.complete();
      severityThreshold$.complete();
      selectedEntities$.complete();
    },
  };
};
