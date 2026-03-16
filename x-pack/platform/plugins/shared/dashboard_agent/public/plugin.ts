/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type {
  DashboardAgentPluginPublicSetup,
  DashboardAgentPluginPublicStart,
  DashboardAgentPluginPublicSetupDependencies,
  DashboardAgentPluginPublicStartDependencies,
} from './types';

export class DashboardAgentPlugin
  implements
    Plugin<
      DashboardAgentPluginPublicSetup,
      DashboardAgentPluginPublicStart,
      DashboardAgentPluginPublicSetupDependencies,
      DashboardAgentPluginPublicStartDependencies
    >
{
  private cleanupAttachmentUi?: () => void;

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
    import('./attachment_types').then(({ registerDashboardAttachmentUiDefinition }) => {
      const dashboardLocator = plugins.share.url.locators.get(DASHBOARD_APP_LOCATOR);
      const findDashboardsServicePromise = plugins.dashboard.findDashboardsService();
      this.cleanupAttachmentUi = registerDashboardAttachmentUiDefinition({
        attachments: plugins.agentBuilder.attachments,
        dashboardLocator,
        unifiedSearch: plugins.unifiedSearch,
        doesSavedDashboardExist: async (dashboardId: string) => {
          const findDashboardsService = await findDashboardsServicePromise;
          const result = await findDashboardsService.findById(dashboardId);
          return result.status === 'success';
        },
      });
    });

    return {};
  }

  public stop() {
    this.cleanupAttachmentUi?.();
  }
}
