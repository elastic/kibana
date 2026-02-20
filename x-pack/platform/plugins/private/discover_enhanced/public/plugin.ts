/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { PluginInitializerContext } from '@kbn/core/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import {
  APPLY_FILTER_TRIGGER,
  CONTEXT_MENU_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { Config } from '../common';

export interface DiscoverEnhancedSetupDependencies {
  discover: DiscoverSetup;
  embeddable: EmbeddableSetup;
  share?: SharePluginSetup;
  uiActions: UiActionsSetup;
}

export interface DiscoverEnhancedStartDependencies {
  discover: DiscoverStart;
  embeddable: EmbeddableStart;
  share?: SharePluginStart;
  uiActions: UiActionsStart;
}

export class DiscoverEnhancedPlugin
  implements
    Plugin<void, void, DiscoverEnhancedSetupDependencies, DiscoverEnhancedStartDependencies>
{
  public readonly config: Config;

  constructor(protected readonly context: PluginInitializerContext) {
    this.config = context.config.get<Config>();
  }

  setup(
    core: CoreSetup<DiscoverEnhancedStartDependencies>,
    { uiActions, share }: DiscoverEnhancedSetupDependencies
  ) {
    const start = createStartServicesGetter(core.getStartServices);
    const isSharePluginInstalled = !!share;

    if (isSharePluginInstalled) {
      const params = { start };

      if (this.config.actions.exploreDataInContextMenu.enabled) {
        uiActions.addTriggerActionAsync(CONTEXT_MENU_TRIGGER, 'ACTION_EXPLORE_DATA', async () => {
          const { ExploreDataContextMenuAction } = await import('./actions');
          const exploreDataAction = new ExploreDataContextMenuAction(params);
          return exploreDataAction;
        });
      }

      if (this.config.actions.exploreDataInChart.enabled) {
        uiActions.addTriggerActionAsync(
          APPLY_FILTER_TRIGGER,
          'ACTION_EXPLORE_DATA_CHART',
          async () => {
            const { ExploreDataChartAction } = await import('./actions');
            const exploreDataChartAction = new ExploreDataChartAction(params);
            return exploreDataChartAction;
          }
        );
      }
    }
  }

  start(core: CoreStart, plugins: DiscoverEnhancedStartDependencies) {}

  stop() {}
}
