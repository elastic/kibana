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
import { registerSkills } from './skills';
import { manageDashboardTool } from './tools';
import { getIsDashboardAgentEnabled } from './utils/get_is_dashboard_agent_enabled';
import { DASHBOARD_AGENT_FEATURE_FLAG } from '../common/constants';
import { createDashboardAttachmentType } from './attachment_types';

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
            `Skipping dashboard skill and tools registration because feature flag "${DASHBOARD_AGENT_FEATURE_FLAG}" is set to false`
          );
          return;
        }

        this.registerToolsAndSkills(setupDeps).catch((error) => {
          this.logger.error(`Error registering dashboard tools and skills: ${error}`);
        });
      })
      .catch((error) => {
        this.logger.error(`Error checking whether the dashboard agent is enabled: ${error}`);
      });

    return {};
  }

  private async registerToolsAndSkills(setupDeps: DashboardAgentSetupDependencies) {
    // Register the dashboard attachment type
    setupDeps.agentBuilder.attachments.registerType(createDashboardAttachmentType() as any);

    // Register the consolidated manage_dashboard tool
    setupDeps.agentBuilder.tools.register(manageDashboardTool({}));

    // Register dashboard skills for the default agent.
    await registerSkills(setupDeps.agentBuilder);
  }

  start(
    _coreStart: CoreStart,
    _startDeps: DashboardAgentStartDependencies
  ): DashboardAgentPluginStart {
    return {};
  }

  stop() {}
}
