/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators, TitlesApi } from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatest, map, merge } from 'rxjs';
import type { TypeOf } from '@kbn/config-schema';
import type { AnomalySwimlaneEmbeddableUserInput } from '..';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type { SwimlaneType } from '../../application/explorer/explorer_constants';
import { SWIM_LANE_DEFAULT_PAGE_SIZE } from '../../application/explorer/explorer_constants';
import type { AnomalySwimLaneComponentApi, AnomalySwimLaneEmbeddableState } from './types';
import type { anomalySwimLaneControlsStateSchema } from '../../../server/embeddable/schemas';

type AnomalySwimLaneControlsState = TypeOf<typeof anomalySwimLaneControlsStateSchema>;

export const swimLaneComparators: StateComparators<AnomalySwimLaneControlsState> = {
  jobIds: 'deepEquality',
  swimlaneType: 'referenceEquality',
  viewBy: 'referenceEquality',
  perPage: 'referenceEquality',
};

export const initializeSwimLaneControls = (
  initialState: AnomalySwimLaneEmbeddableState,
  titlesApi: TitlesApi
) => {
  const jobIds = new BehaviorSubject<JobId[]>(initialState.jobIds);
  const swimlaneType = new BehaviorSubject<SwimlaneType>(initialState.swimlaneType);
  const viewBy = new BehaviorSubject<string | undefined>(
    initialState.swimlaneType === 'viewBy' ? initialState.viewBy : undefined
  );
  const fromPage = new BehaviorSubject<number>(1);
  const perPage = new BehaviorSubject<number | undefined>(
    initialState.perPage ?? SWIM_LANE_DEFAULT_PAGE_SIZE
  );

  const updateUserInput = (update: AnomalySwimlaneEmbeddableUserInput) => {
    jobIds.next(update.jobIds);
    swimlaneType.next(update.swimlaneType);
    viewBy.next(update.viewBy);
    titlesApi.setTitle(update.panelTitle);
  };

  const updatePagination = (update: { perPage?: number; fromPage: number }) => {
    fromPage.next(update.fromPage);
    if (update.perPage) {
      perPage.next(update.perPage);
    }
  };

  const subscription = combineLatest([jobIds, swimlaneType, viewBy]).subscribe(() => {
    updatePagination({ fromPage: 1 });
  });

  const getLatestState = (): AnomalySwimLaneControlsState => {
    return {
      jobIds: jobIds.value,
      swimlaneType: swimlaneType.value,
      viewBy: viewBy.value,
      perPage: perPage.value,
    };
  };

  return {
    api: {
      jobIds,
      swimlaneType,
      viewBy,
      fromPage,
      perPage,
      updateUserInput,
      updatePagination,
    } as unknown as AnomalySwimLaneComponentApi,
    anyStateChange$: merge(jobIds, swimlaneType, viewBy, perPage).pipe(map(() => undefined)),
    getLatestState,
    reinitializeState: (lastSavedState: AnomalySwimLaneControlsState) => {
      jobIds.next(lastSavedState.jobIds);
      swimlaneType.next(lastSavedState.swimlaneType);
      viewBy.next(lastSavedState.viewBy);
      perPage.next(lastSavedState.perPage);
    },
    cleanup: () => {
      subscription.unsubscribe();

      jobIds.complete();
      swimlaneType.complete();
      viewBy.complete();
      fromPage.complete();
      perPage.complete();
    },
  };
};
