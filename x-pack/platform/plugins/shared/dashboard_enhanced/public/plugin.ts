/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { SharePluginStart, SharePluginSetup } from '@kbn/share-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
} from '@kbn/ui-actions-enhanced-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { DashboardDrilldownsService } from './services';

export interface SetupDependencies {
  uiActionsEnhanced: AdvancedUiActionsSetup;
  embeddable: EmbeddableSetup;
  share: SharePluginSetup;
}

export interface StartDependencies {
  uiActionsEnhanced: AdvancedUiActionsStart;
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  share: SharePluginStart;
  dashboard: DashboardStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupContract {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartContract {}

export class DashboardEnhancedPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies>
{
  public readonly drilldowns = new DashboardDrilldownsService();

  constructor(protected readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): SetupContract {
    this.drilldowns.bootstrap(core, plugins, {
      enableDrilldowns: true,
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    return {};
  }

  public stop() {}
}
