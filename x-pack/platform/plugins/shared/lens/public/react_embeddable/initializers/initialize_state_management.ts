/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StateComparators } from '@kbn/presentation-publishing';
import {
  type PublishesBlockingError,
  type PublishesDataLoading,
  type PublishesDataViews,
  type PublishesSavedObjectId,
  type PublishesRendered,
} from '@kbn/presentation-publishing';
import deepEqual from 'fast-deep-equal';
import { noop } from 'lodash';
import type { Observable } from 'rxjs';
import { BehaviorSubject, map, merge } from 'rxjs';
import type {
  IntegrationCallbacks,
  LensInternalApi,
  LensRuntimeState,
  LensSerializedState,
} from '@kbn/lens-common';
import type { LensWireAPIConfig } from '@kbn/lens-common-2';
import { isFlattenedAPIConfig, unflattenAPIConfig } from '../../../common/transforms/utils';

export interface StateManagementConfig {
  api: Pick<IntegrationCallbacks, 'updateAttributes' | 'updateRefId'> &
    PublishesSavedObjectId &
    PublishesDataViews &
    PublishesDataLoading &
    PublishesRendered &
    PublishesBlockingError;
  anyStateChange$: Observable<void>;
  getComparators: () => StateComparators<Pick<LensSerializedState, 'attributes' | 'ref_id'>>;
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

  const resolveAttributes = (
    value: LensSerializedState['attributes'] | undefined,
    state?: LensWireAPIConfig
  ) => {
    if (value !== undefined) return value;
    if (state && 'attributes' in state && state.attributes) {
      return state.attributes;
    }
    if (state && isFlattenedAPIConfig(state)) {
      return unflattenAPIConfig(state).attributes;
    }
    return value;
  };

  return {
    api: {
      updateAttributes: internalApi.updateAttributes,
      updateRefId: (newRefId: LensRuntimeState['ref_id']) => savedObjectId$.next(newRefId),
      savedObjectId$,
      dataViews$: internalApi.dataViews$,
      dataLoading$: internalApi.dataLoading$,
      blockingError$: internalApi.blockingError$,
      rendered$: internalApi.hasRenderCompleted$,
    },
    anyStateChange$: merge(internalApi.attributes$).pipe(map(() => undefined)),
    getComparators: () => {
      return {
        attributes:
          initialState.ref_id === undefined
            ? (lastValue, currentValue, lastState, currentState) => {
                const lastAttributes = resolveAttributes(lastValue, lastState);
                const currentAttributes = resolveAttributes(currentValue, currentState);
                return deepEqual(lastAttributes, currentAttributes);
              }
            : 'skip',
        ref_id: 'skip',
      };
    },
    getLatestState: () => {
      return {
        attributes: internalApi.attributes$.getValue(),
        ref_id: savedObjectId$.getValue(),
      };
    },
    reinitializeRuntimeState: (lastSavedRuntimeState: LensRuntimeState) => {
      internalApi.updateAttributes(lastSavedRuntimeState.attributes);
    },
    cleanup: noop,
  };
}
