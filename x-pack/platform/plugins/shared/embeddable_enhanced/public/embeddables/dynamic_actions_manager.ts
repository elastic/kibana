/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableApiContext, StateComparators } from '@kbn/presentation-publishing';
import { apiHasUniqueId } from '@kbn/presentation-publishing';
import { UiActionsEnhancedDynamicActionManager as DynamicActionManager } from '@kbn/ui-actions-enhanced-plugin/public';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject, map } from 'rxjs';
import { DynamicActionStorage, type DynamicActionStorageApi } from './dynamic_action_storage';
import { getDynamicActionsState } from './get_dynamic_actions_state';
import type { DynamicActionsSerializedState, EmbeddableDynamicActionsManager } from './types';
import type { StartDependencies } from '../plugin';
import { extractEnhancements, serializeEnhancements } from './bwc';

export function initializeDynamicActionsManager(
  uuid: string,
  getTitle: () => string | undefined,
  state: DynamicActionsSerializedState,
  services: StartDependencies
): EmbeddableDynamicActionsManager {
  const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>(
    getDynamicActionsState(extractEnhancements(state))
  );
  const api: DynamicActionStorageApi = {
    dynamicActionsState$,
    setDynamicActions: (enhancements) => {
      dynamicActionsState$.next(getDynamicActionsState(enhancements));
      storage.reload$.next();
    },
  };
  const storage = new DynamicActionStorage(uuid, getTitle, api);
  const dynamicActions = new DynamicActionManager({
    isCompatible: async (context: EmbeddableApiContext) => {
      const { embeddable } = context;
      return apiHasUniqueId(embeddable) && embeddable.uuid === uuid;
    },
    storage,
    uiActions: services.uiActionsEnhanced,
  });

  function getLatestState() {
    return serializeEnhancements(dynamicActionsState$.getValue());
  }

  return {
    api: { ...api, enhancements: { dynamicActions } },
    comparators: {
      enhancements: 'skip',
      drilldowns: (a, b) => deepEqual(a, b),
    } as StateComparators<DynamicActionsSerializedState>,
    anyStateChange$: dynamicActionsState$.pipe(map(() => undefined)),
    getLatestState,
    serializeState: () => getLatestState(),
    reinitializeState: (lastState: DynamicActionsSerializedState) => {
      api.setDynamicActions(getDynamicActionsState(extractEnhancements(lastState)));
    },
    startDynamicActions: () => {
      dynamicActions.start().catch((error) => {
        /* eslint-disable no-console */
        console.log('Failed to start embeddable dynamic actions', dynamicActions);
        console.error(error);
        /* eslint-enable */
      });

      return {
        stopDynamicActions: () => {
          dynamicActions.stop().catch((error) => {
            /* eslint-disable no-console */
            console.log('Failed to stop embeddable dynamic actions', dynamicActions);
            console.error(error);
            /* eslint-enable */
          });
        },
      };
    },
  };
}
