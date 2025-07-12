/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { SharePluginStart, SharePluginSetup } from '@kbn/share-plugin/public';
import {
  CONTEXT_MENU_TRIGGER,
  EmbeddableSetup,
  EmbeddableStart,
} from '@kbn/embeddable-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { setKibanaServices, untilPluginStartServicesReady } from './services/kibana_services';
import { EmbeddableToDashboardDrilldown } from './services/drilldowns/embeddable_to_dashboard_drilldown';

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
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupContract {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartContract {}

export class DashboardEnhancedPlugin
  implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies>
{
  constructor(protected readonly context: PluginInitializerContext) {}

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies): SetupContract {
    const start = createStartServicesGetter(core.getStartServices);

    const dashboardToDashboardDrilldown = new EmbeddableToDashboardDrilldown({ start });
    plugins.uiActionsEnhanced.registerDrilldown(dashboardToDashboardDrilldown);

    return {};
  }

  public start(core: CoreStart, plugins: StartDependencies): StartContract {
    setKibanaServices(core, plugins);

    untilPluginStartServicesReady().then(() => {
      plugins.uiActionsEnhanced.addTriggerActionAsync(
        CONTEXT_MENU_TRIGGER,
        'OPEN_FLYOUT_ADD_DRILLDOWN',
        async () => {
          const { flyoutCreateDrilldownAction } = await import(
            './services/drilldowns/actions/flyout_create_drilldown'
          );
          return flyoutCreateDrilldownAction;
        }
      );

      plugins.uiActionsEnhanced.addTriggerActionAsync(
        CONTEXT_MENU_TRIGGER,
        'OPEN_FLYOUT_EDIT_DRILLDOWN',
        async () => {
          const { flyoutEditDrilldownAction } = await import(
            './services/drilldowns/actions/flyout_edit_drilldown'
          );
          return flyoutEditDrilldownAction;
        }
      );
    });

    return {};
  }

  public stop() {}
}
