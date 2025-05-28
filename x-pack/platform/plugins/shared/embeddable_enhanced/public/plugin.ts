/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import {
  apiHasUniqueId,
  EmbeddableApiContext,
  StateComparators,
} from '@kbn/presentation-publishing';
import {
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
  DynamicActionsState,
  UiActionsEnhancedDynamicActionManager as DynamicActionManager,
} from '@kbn/ui-actions-enhanced-plugin/public';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject, Observable, map } from 'rxjs';
import {
  DynamicActionStorage,
  type DynamicActionStorageApi,
} from './embeddables/dynamic_action_storage';
import { HasDynamicActions } from './embeddables/interfaces/has_dynamic_actions';
import { getDynamicActionsState } from './get_dynamic_actions_state';

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
  uiActionsEnhanced: AdvancedUiActionsSetup;
}

export interface StartDependencies {
  embeddable: EmbeddableStart;
  uiActionsEnhanced: AdvancedUiActionsStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupContract {}

export interface EmbeddableDynamicActionsManager {
  api: HasDynamicActions;
  comparators: StateComparators<DynamicActionsSerializedState>;
  anyStateChange$: Observable<void>;
  getLatestState: () => DynamicActionsSerializedState;
  reinitializeState: (lastState: DynamicActionsSerializedState) => void;
  startDynamicActions: () => { stopDynamicActions: () => void };
}

export interface StartContract {
  initializeEmbeddableDynamicActions: (
    uuid: string,
    getTitle: () => string | undefined,
    state: DynamicActionsSerializedState
  ) => EmbeddableDynamicActionsManager;
}

export interface DynamicActionsSerializedState {
  enhancements?: { dynamicActions: DynamicActionsState };
}

export class EmbeddableEnhancedPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies>
{
  constructor(protected readonly context: PluginInitializerContext) {}

  private uiActions?: StartDependencies['uiActionsEnhanced'];

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): SetupContract {
    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    this.uiActions = plugins.uiActionsEnhanced;

    return {
      initializeEmbeddableDynamicActions: this.initializeDynamicActions.bind(this),
    };
  }

  public stop() {}

  private initializeDynamicActions(
    uuid: string,
    getTitle: () => string | undefined,
    state: DynamicActionsSerializedState
  ): EmbeddableDynamicActionsManager {
    const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>(
      getDynamicActionsState(state.enhancements)
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
      uiActions: this.uiActions!,
    });

    return {
      api: { ...api, enhancements: { dynamicActions } },
      comparators: {
        enhancements: (a, b) => {
          return deepEqual(getDynamicActionsState(a), getDynamicActionsState(b));
        },
      } as StateComparators<DynamicActionsSerializedState>,
      anyStateChange$: dynamicActionsState$.pipe(map(() => undefined)),
      getLatestState: () => {
        return { enhancements: dynamicActionsState$.getValue() };
      },
      reinitializeState: (lastState: DynamicActionsSerializedState) => {
        api.setDynamicActions(lastState.enhancements);
      },
      startDynamicActions: () => {
        const stop = this.startDynamicActions(dynamicActions);
        return { stopDynamicActions: stop };
      },
    };
  }

  private startDynamicActions(dynamicActions: DynamicActionManager) {
    dynamicActions.start().catch((error) => {
      /* eslint-disable no-console */

      console.log('Failed to start embeddable dynamic actions', dynamicActions);
      console.error(error);
      /* eslint-enable */
    });

    const stop = () => {
      dynamicActions.stop().catch((error) => {
        /* eslint-disable no-console */

        console.log('Failed to stop embeddable dynamic actions', dynamicActions);
        console.error(error);
        /* eslint-enable */
      });
    };

    return stop;
  }
}
