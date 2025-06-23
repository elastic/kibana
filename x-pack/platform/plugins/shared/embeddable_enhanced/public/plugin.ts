/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import {
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { SerializedPanelState } from '@kbn/presentation-publishing';
import type {
  DynamicActionsSerializedState,
  EmbeddableDynamicActionsManager,
} from './embeddables/types';
import { initializeDynamicActionsManager } from './embeddables/dynamic_actions_manager';

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

export interface StartContract {
  initializeEmbeddableDynamicActions: (
    uuid: string,
    getTitle: () => string | undefined,
    state: SerializedPanelState<DynamicActionsSerializedState>
  ) => EmbeddableDynamicActionsManager;
}

export class EmbeddableEnhancedPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies>
{
  constructor(protected readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): SetupContract {
    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    return {
      initializeEmbeddableDynamicActions: (
        uuid: string,
        getTitle: () => string | undefined,
        state: SerializedPanelState<DynamicActionsSerializedState>
      ) => {
        return initializeDynamicActionsManager(uuid, getTitle, state, plugins);
      },
    };
  }

  public stop() {}
}
