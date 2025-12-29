/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type {
  DashboardAgentSetupDependencies,
  DashboardAgentStartDependencies,
  DashboardAgentPluginSetup,
  DashboardAgentPluginStart,
} from './types';
import { registerDashboardAgent } from './register_agent';
import { createDashboardTool, updateDashboardTool } from './tools';
import { getIsDashboardAgentEnabled } from './utils/get_is_dashboard_agent_enabled';
import { DASHBOARD_AGENT_FEATURE_FLAG } from '../common/constants';

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

    getIsDashboardAgentEnabled(coreSetup)
      .then((isDashboardAgentEnabled) => {
        if (!isDashboardAgentEnabled) {
          this.logger.debug(
            `Skipping dashboard agent registration because feature flag "${DASHBOARD_AGENT_FEATURE_FLAG}" is set to false`
          );
          return;
        }

        this.registerToolsAndAgent(coreSetup, setupDeps).catch((error) => {
          this.logger.error(`Error registering dashboard agent and tools: ${error}`);
        });
      })
      .catch((error) => {
        this.logger.error(`Error checking whether the dashboard agent is enabled: ${error}`);
      });

    return {};
  }

  private async registerToolsAndAgent(
    coreSetup: CoreSetup<DashboardAgentStartDependencies, DashboardAgentPluginStart>,
    setupDeps: DashboardAgentSetupDependencies
  ) {
    const [coreStart, startDeps] = await coreSetup.getStartServices();

    const dashboardLocator =
      startDeps.share?.url?.locators?.get<DashboardLocatorParams>('DASHBOARD_APP_LOCATOR');

    if (!dashboardLocator) {
      this.logger.warn('Dashboard locator is unavailable; skipping dashboard tool registration.');
      return;
    }

    setupDeps.agentBuilder.tools.register(
      createDashboardTool(startDeps.dashboard, coreStart.savedObjects, {
        dashboardLocator,
        spaces: startDeps.spaces,
      })
    );
    setupDeps.agentBuilder.tools.register(
      updateDashboardTool(startDeps.dashboard, coreStart.savedObjects, {
        dashboardLocator,
        spaces: startDeps.spaces,
      })
    );

    // Register the dashboard agent
    registerDashboardAgent(setupDeps.agentBuilder);
  }

  start(
    _coreStart: CoreStart,
    _startDeps: DashboardAgentStartDependencies
  ): DashboardAgentPluginStart {
    return {};
  }

  stop() {}
}
