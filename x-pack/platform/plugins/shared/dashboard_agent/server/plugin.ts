/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  DashboardAgentSetupDependencies,
  DashboardAgentStartDependencies,
  DashboardAgentPluginSetup,
  DashboardAgentPluginStart,
} from './types';
import { registerDashboardAgent } from './register_agent';
import { createDashboardTool, getDashboardTool, updateDashboardTool } from './tools';

export class DashboardAgentPlugin
  implements
    Plugin<
      DashboardAgentPluginSetup,
      DashboardAgentPluginStart,
      DashboardAgentSetupDependencies,
      DashboardAgentStartDependencies
    >
{
  private logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<DashboardAgentStartDependencies, DashboardAgentPluginStart>,
    setupDeps: DashboardAgentSetupDependencies
  ): DashboardAgentPluginSetup {
    this.logger.debug('Setting up Dashboard Agent plugin');

    // Register dashboard-specific tools during start lifecycle when dashboard plugin is available
    void coreSetup.getStartServices().then(([coreStart, startDeps]) => {
      // @TODO: Check using uiSettings if dashboard tools enable
      // const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
      // const createVisualizationsEnabled = await uiSettingsClient.get<boolean>(
      //   AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID
      // ); // @TODO: remove

      // @TODO: remove
      console.log(`--@@coreStart.share`, coreStart.share);
      console.log(`--@@coreStart.uiSettings`, coreStart.uiSettings);

      console.log(`--@@startDeps.share`, startDeps.share);
      const dashboardLocator = startDeps.share?.url?.locators?.get('DASHBOARD_APP_LOCATOR');
      // @TODO: remove
      console.log(`--@@dashboardLocator`, dashboardLocator);
      setupDeps.onechat.tools.register(
        createDashboardTool(startDeps.dashboard, coreStart.savedObjects, { dashboardLocator })
      );
      setupDeps.onechat.tools.register(
        getDashboardTool(startDeps.dashboard, coreStart.savedObjects, { dashboardLocator })
      );
      setupDeps.onechat.tools.register(
        updateDashboardTool(startDeps.dashboard, coreStart.savedObjects, { dashboardLocator })
      );
    });

    registerDashboardAgent(setupDeps.onechat);

    return {};
  }

  start(
    _coreStart: CoreStart,
    _startDeps: DashboardAgentStartDependencies
  ): DashboardAgentPluginStart {
    return {};
  }

  stop() {}
}
