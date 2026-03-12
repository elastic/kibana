/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators, TitlesApi } from '@kbn/presentation-publishing';
import { BehaviorSubject, map, merge } from 'rxjs';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type {
  SingleMetricViewerEmbeddableState,
  SingleMetricViewerEmbeddableUserInput,
} from './types';

export type AnomalySwimLaneControlsState = Pick<
  SingleMetricViewerEmbeddableState,
  'jobIds' | 'selectedDetectorIndex' | 'selectedEntities' | 'functionDescription'
>;

export type SingleMetricViewerControlsState = Pick<
  SingleMetricViewerEmbeddableState,
  'jobIds' | 'selectedDetectorIndex' | 'selectedEntities' | 'functionDescription' | 'forecastId'
>;

export const singleMetricViewerComparators: StateComparators<SingleMetricViewerControlsState> = {
  jobIds: 'deepEquality',
  forecastId: 'referenceEquality',
  selectedDetectorIndex: 'referenceEquality',
  selectedEntities: 'deepEquality',
  functionDescription: 'referenceEquality',
};

export const initializeSingleMetricViewerControls = (
  initialState: SingleMetricViewerEmbeddableState,
  titlesApi: TitlesApi
) => {
  const functionDescription = new BehaviorSubject<string | undefined>(
    initialState.functionDescription
  );
  const jobIds = new BehaviorSubject<JobId[]>(initialState.jobIds);
  const selectedDetectorIndex = new BehaviorSubject<number>(
    initialState.selectedDetectorIndex ?? 0
  );
  const selectedEntities = new BehaviorSubject<Record<string, any> | undefined>(
    initialState.selectedEntities
  );
  const forecastId = new BehaviorSubject<string | undefined>(initialState.forecastId);

  const updateUserInput = (update: SingleMetricViewerEmbeddableUserInput) => {
    jobIds.next(update.jobIds);
    functionDescription.next(update.functionDescription);
    selectedDetectorIndex.next(update.selectedDetectorIndex);
    selectedEntities.next(update.selectedEntities);
    titlesApi.setTitle(update.panelTitle);
  };

  const updateForecastId = (id: string | undefined) => {
    forecastId.next(id);
  };

  const getLatestState = (): SingleMetricViewerControlsState => {
    return {
      jobIds: jobIds.getValue(),
      forecastId: forecastId.getValue(),
      selectedDetectorIndex: selectedDetectorIndex.getValue(),
      selectedEntities: selectedEntities.getValue(),
      functionDescription: functionDescription?.getValue(),
    };
  };

  return {
    api: {
      jobIds,
      forecastId,
      selectedDetectorIndex,
      selectedEntities,
      functionDescription,
      updateForecastId,
      updateUserInput,
    },
    anyStateChange$: merge(
      jobIds,
      forecastId,
      selectedDetectorIndex,
      selectedEntities,
      functionDescription
    ).pipe(map(() => undefined)),
    getLatestState,
    reinitializeState: (lastSavedState: SingleMetricViewerControlsState) => {
      jobIds.next(lastSavedState.jobIds);
      forecastId.next(lastSavedState.forecastId);
      selectedDetectorIndex.next(lastSavedState.selectedDetectorIndex);
      selectedEntities.next(lastSavedState.selectedEntities);
      functionDescription.next(lastSavedState.functionDescription);
    },
    cleanup: () => {
      forecastId.complete();
      jobIds.complete();
      selectedDetectorIndex.complete();
      selectedEntities.complete();
      functionDescription.complete();
    },
  };
};
