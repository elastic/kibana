/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type {
  DashboardAgentPluginPublicSetup,
  DashboardAgentPluginPublicStart,
  DashboardAgentPluginPublicSetupDependencies,
  DashboardAgentPluginPublicStartDependencies,
} from './types';
import { registerDashboardAttachmentUiDefinition } from './attachment_types';

export class DashboardAgentPlugin
  implements
    Plugin<
      DashboardAgentPluginPublicSetup,
      DashboardAgentPluginPublicStart,
      DashboardAgentPluginPublicSetupDependencies,
      DashboardAgentPluginPublicStartDependencies
    >
{
  constructor(_initContext: PluginInitializerContext) {}

  public setup(
    _core: CoreSetup<DashboardAgentPluginPublicStartDependencies, DashboardAgentPluginPublicStart>,
    _plugins: DashboardAgentPluginPublicSetupDependencies
  ): DashboardAgentPluginPublicSetup {
    return {};
  }

  public start(
    _core: CoreStart,
    plugins: DashboardAgentPluginPublicStartDependencies
  ): DashboardAgentPluginPublicStart {
    registerDashboardAttachmentUiDefinition({
      attachments: plugins.agentBuilder.attachments,
    });

    return {};
  }

  public stop() {}
}
