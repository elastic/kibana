/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from '../../../../src/core/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import {
  AdvancedUiActionsSetup,
  AdvancedUiActionsStart,
} from '../../../../x-pack/plugins/advanced_ui_actions/public';
import { DashboardHelloWorldDrilldown } from './dashboard_hello_world_drilldown';
import { DashboardToUrlDrilldown } from './dashboard_to_url_drilldown';
import { DashboardToDiscoverDrilldown } from './dashboard_to_discover_drilldown';
import { createStartServicesGetter } from '../../../../src/plugins/kibana_utils/public';

export interface SetupDependencies {
  data: DataPublicPluginSetup;
  advancedUiActions: AdvancedUiActionsSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  advancedUiActions: AdvancedUiActionsStart;
}

export class UiActionsEnhancedExamplesPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies> {
  public setup(
    core: CoreSetup<StartDependencies>,
    { advancedUiActions: uiActions }: SetupDependencies
  ) {
    const start = createStartServicesGetter(core.getStartServices);

    uiActions.registerDrilldown(new DashboardHelloWorldDrilldown());
    uiActions.registerDrilldown(new DashboardToUrlDrilldown());
    uiActions.registerDrilldown(new DashboardToDiscoverDrilldown({ start }));
  }

  public start(core: CoreStart, plugins: StartDependencies) {}

  public stop() {}
}
