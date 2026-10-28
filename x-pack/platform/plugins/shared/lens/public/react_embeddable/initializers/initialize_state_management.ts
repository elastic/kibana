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
import { isPlainObject } from 'lodash';
import type { Observable } from 'rxjs';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
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
 * Drops object keys holding `undefined`, which are lost once state is persisted as JSON.
 */
const omitUndefinedKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(omitUndefinedKeys);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, omitUndefinedKeys(entryValue)])
    );
  }
  return value;
};

/**
 * Due to inline editing we need something advanced to handle the state
 * management at the embeddable level, so here's the initializers for it
 */
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

/** Compares the attributes of a by-value panel; a library panel saves them on its own. */
export const getStateComparators = (
  refId: string | undefined
): StateComparators<Pick<LensSerializedState, 'attributes' | 'ref_id'>> => ({
  attributes:
    refId === undefined
      ? (lastValue, currentValue, lastState, currentState) => {
          const lastAttributes = resolveAttributes(lastValue, lastState);
          const currentAttributes = resolveAttributes(currentValue, currentState);
          return deepEqual(omitUndefinedKeys(lastAttributes), omitUndefinedKeys(currentAttributes));
        }
      : 'skip',
  ref_id: 'skip',
});

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
      dataViews$: internalApi.dataViews$,
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
    getComparators: () => getStateComparators(initialState.ref_id),
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
