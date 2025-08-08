/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiHasUniqueId,
  EmbeddableApiContext,
  SerializedPanelState,
  StateComparators,
} from '@kbn/presentation-publishing';
import {
  UiActionsEnhancedDynamicActionManager as DynamicActionManager,
  DynamicActionsState,
} from '@kbn/ui-actions-enhanced-plugin/public';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject, map } from 'rxjs';
import { DynamicActionStorage, type DynamicActionStorageApi } from './dynamic_action_storage';
import { getDynamicActionsState } from './get_dynamic_actions_state';
import { DynamicActionsSerializedState, EmbeddableDynamicActionsManager } from './types';
import type { StartDependencies } from '../plugin';

export function initializeDynamicActionsManager(
  uuid: string,
  getTitle: () => string | undefined,
  state: SerializedPanelState<DynamicActionsSerializedState>,
  services: StartDependencies
): EmbeddableDynamicActionsManager {
  const enhancement = services.embeddable.getEnhancement('dynamicActions');
  const initialEnhancementsState =
    enhancement && state.rawState.enhancements?.dynamicActions
      ? {
          dynamicActions: enhancement.inject(
            state.rawState.enhancements.dynamicActions,
            state.references ?? []
          ),
        }
      : state.rawState.enhancements;
  const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>(
    getDynamicActionsState(initialEnhancementsState)
  );
  const api: DynamicActionStorageApi = {
    dynamicActionsState$,
    setDynamicActions: (enhancements) => {
      dynamicActionsState$.next(getDynamicActionsState(enhancements));
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
    return { enhancements: dynamicActionsState$.getValue() };
  }

  return {
    api: { ...api, enhancements: { dynamicActions } },
    comparators: {
      enhancements: (a, b) => {
        return deepEqual(getDynamicActionsState(a), getDynamicActionsState(b));
      },
    } as StateComparators<DynamicActionsSerializedState>,
    anyStateChange$: dynamicActionsState$.pipe(map(() => undefined)),
    getLatestState,
    serializeState: () => {
      const latestState = getLatestState();
      if (!enhancement || !latestState.enhancements?.dynamicActions) {
        return {
          rawState: latestState,
          references: [],
        };
      }

      const extractResults = enhancement.extract(latestState.enhancements.dynamicActions);
      return {
        rawState: {
          enhancements: {
            dynamicActions: extractResults.state as DynamicActionsState,
          },
        },
        references: extractResults.references,
      };
    },
    reinitializeState: (lastState: DynamicActionsSerializedState) => {
      api.setDynamicActions(lastState.enhancements);
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
