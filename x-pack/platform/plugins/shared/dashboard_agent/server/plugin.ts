/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type {
  DashboardAgentSetupDependencies,
  DashboardAgentStartDependencies,
  DashboardAgentPluginSetup,
  DashboardAgentPluginStart,
} from './types';
import { registerSkills } from './skills';
import { createDashboardAttachmentType } from './attachment_types';
import { dashboardSmlType } from './sml_types';

export class DashboardAgentPlugin
  implements
    Plugin<
      DashboardAgentPluginSetup,
      DashboardAgentPluginStart,
      DashboardAgentSetupDependencies,
      DashboardAgentStartDependencies
    >
{
  setup(
    coreSetup: CoreSetup<DashboardAgentStartDependencies, DashboardAgentPluginStart>,
    setupDeps: DashboardAgentSetupDependencies
  ): DashboardAgentPluginSetup {
    // Create a getter for the dashboard client that will be available after start
    const getDashboardClient = async () => {
      const [, startDeps] = await coreSetup.getStartServices();
      return startDeps.dashboard.client;
    };

    setupDeps.agentBuilder.attachments.registerType(
      createDashboardAttachmentType({ getDashboardClient })
    );
    setupDeps.agentBuilder.sml.registerType(dashboardSmlType);
    registerSkills(setupDeps.agentBuilder);
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
