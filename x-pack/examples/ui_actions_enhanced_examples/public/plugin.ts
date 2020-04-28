/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from '../../../../src/core/public';
import { UiActionsSetup, UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { DrilldownsSetup, DrilldownsStart } from '../../../../x-pack/plugins/drilldowns/public';
import { DashboardHelloWorldDrilldown } from './dashboard_hello_world_drilldown';
import { DashboardToUrlDrilldown } from './dashboard_to_url_drilldown';
import { DashboardToDiscoverDrilldown } from './dashboard_to_discover_drilldown';
import { createStartServicesGetter } from '../../../../src/plugins/kibana_utils/public';

export interface SetupDependencies {
  data: DataPublicPluginSetup;
  drilldowns: DrilldownsSetup;
  uiActions: UiActionsSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  drilldowns: DrilldownsStart;
  uiActions: UiActionsStart;
}

export class UiActionsEnhancedExamplesPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies> {
  public setup(core: CoreSetup<StartDependencies>, { drilldowns }: SetupDependencies) {
    const start = createStartServicesGetter(core.getStartServices);

    drilldowns.registerDrilldown(new DashboardHelloWorldDrilldown());
    drilldowns.registerDrilldown(new DashboardToUrlDrilldown());
    drilldowns.registerDrilldown(new DashboardToDiscoverDrilldown({ start }));
  }

  public start(core: CoreStart, plugins: StartDependencies) {}

  public stop() {}
}
