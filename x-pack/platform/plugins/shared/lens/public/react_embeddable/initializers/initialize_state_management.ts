/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  type PublishesBlockingError,
  type PublishesDataLoading,
  type PublishesDataSources,
  type PublishesSavedObjectId,
  type PublishesRendered,
} from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
import type { IntegrationCallbacks, LensInternalApi, LensRuntimeState } from '@kbn/lens-common';

export interface StateManagementConfig {
  api: Pick<IntegrationCallbacks, 'updateAttributes' | 'updateRefId'> &
    PublishesSavedObjectId &
    PublishesDataSources<DataView> &
    PublishesDataLoading &
    PublishesRendered &
    PublishesBlockingError;
  anyStateChange$: Observable<void>;
  reinitializeRuntimeState: (lastSavedRuntimeState: LensRuntimeState) => void;
  getLatestState: () => Pick<LensRuntimeState, 'attributes' | 'ref_id'>;
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
  // savedObjectId$ exposed for PublishesSavedObjectId compatibility, sourced from ref_id in state
  const savedObjectId$ = new BehaviorSubject<string | undefined>(initialState.ref_id);

  const publicRenderCount$ = new BehaviorSubject(internalApi.renderCount$.getValue() + 1);
  const renderCountSubscription = internalApi.renderCount$.subscribe((count) =>
    publicRenderCount$.next(count + 1)
  );

  return {
    api: {
      updateAttributes: internalApi.updateAttributes,
      updateRefId: (newRefId: LensRuntimeState['ref_id']) => savedObjectId$.next(newRefId),
      savedObjectId$,
      dataSources$: internalApi.dataSources$,
      dataLoading$: internalApi.dataLoading$,
      blockingError$: internalApi.blockingError$,
      rendered$: internalApi.hasRenderCompleted$,
      renderCount$: publicRenderCount$,
    },
    anyStateChange$: merge(
      internalApi.attributes$.pipe(
        skip(1),
        map(() => undefined)
      )
    ),
    getLatestState: () => {
      return {
        attributes: internalApi.attributes$.getValue(),
        ref_id: savedObjectId$.getValue(),
      };
    },
    reinitializeRuntimeState: (lastSavedRuntimeState: LensRuntimeState) => {
      internalApi.updateAttributes(lastSavedRuntimeState.attributes);
      // clear error from a previous load
      internalApi.updateLoadError(lastSavedRuntimeState.loadError);
    },
    cleanup: () => {
      renderCountSubscription.unsubscribe();
    },
  };
}
