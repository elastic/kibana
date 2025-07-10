/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  type PublishesBlockingError,
  type PublishesDataLoading,
  type PublishesDataViews,
  type PublishesSavedObjectId,
  type PublishesRendered,
  StateComparators,
} from '@kbn/presentation-publishing';
import { noop } from 'lodash';
import { BehaviorSubject, Observable, map, merge } from 'rxjs';
import type {
  IntegrationCallbacks,
  LensInternalApi,
  LensRuntimeState,
  LensSerializedState,
} from '../types';

export interface StateManagementConfig {
  api: Pick<IntegrationCallbacks, 'updateAttributes' | 'updateSavedObjectId'> &
    PublishesSavedObjectId &
    PublishesDataViews &
    PublishesDataLoading &
    PublishesRendered &
    PublishesBlockingError;
  anyStateChange$: Observable<void>;
  getComparators: () => StateComparators<Pick<LensSerializedState, 'attributes' | 'savedObjectId'>>;
  reinitializeRuntimeState: (lastSavedRuntimeState: LensRuntimeState) => void;
  getLatestState: () => Pick<LensRuntimeState, 'attributes' | 'savedObjectId'>;
  cleanup: () => void;
}

/**
 * Due to inline editing we need something advanced to handle the state
 * management at the embeddable level, so here's the initializers for it
 */
export function initializeStateManagement(
  initialState: LensRuntimeState,
  internalApi: LensInternalApi
): StateManagementConfig {
  const savedObjectId$ = new BehaviorSubject<LensRuntimeState['savedObjectId']>(
    initialState.savedObjectId
  );

  return {
    api: {
      updateAttributes: internalApi.updateAttributes,
      updateSavedObjectId: (newSavedObjectId: LensRuntimeState['savedObjectId']) =>
        savedObjectId$.next(newSavedObjectId),
      savedObjectId$,
      dataViews$: internalApi.dataViews$,
      dataLoading$: internalApi.dataLoading$,
      blockingError$: internalApi.blockingError$,
      rendered$: internalApi.hasRenderCompleted$,
    },
    anyStateChange$: merge(internalApi.attributes$).pipe(map(() => undefined)),
    getComparators: () => {
      return {
        attributes: initialState.savedObjectId === undefined ? 'deepEquality' : 'skip',
        savedObjectId: 'skip',
      };
    },
    getLatestState: () => {
      return {
        attributes: internalApi.attributes$.getValue(),
        savedObjectId: savedObjectId$.getValue(),
      };
    },
    reinitializeRuntimeState: (lastSavedRuntimeState: LensRuntimeState) => {
      internalApi.updateAttributes(lastSavedRuntimeState.attributes);
    },
    cleanup: noop,
  };
}
