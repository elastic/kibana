/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type {
  DashboardAgentPluginSetup,
  DashboardAgentPluginStart,
  DashboardAgentSetupDependencies,
  DashboardAgentStartDependencies,
} from './types';
import { registerDashboardAttachmentUiDefinition } from './attachment_types';

export class DashboardAgentPlugin
  implements
    Plugin<
      DashboardAgentPluginSetup,
      DashboardAgentPluginStart,
      DashboardAgentSetupDependencies,
      DashboardAgentStartDependencies
    >
{
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<DashboardAgentStartDependencies, DashboardAgentPluginStart>,
    plugins: DashboardAgentSetupDependencies
  ): DashboardAgentPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    plugins: DashboardAgentStartDependencies
  ): DashboardAgentPluginStart {
    // Register the dashboard attachment UI definition
    registerDashboardAttachmentUiDefinition(plugins.agentBuilder.attachments);

    return {};
  }

  public stop() {}
}
