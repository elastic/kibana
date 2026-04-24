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
    core: CoreStart,
    plugins: DashboardAgentPluginPublicStartDependencies
  ): DashboardAgentPluginPublicStart {
    // TODO this causes async imports when plugin starts
    // Please avoid this practice as it hides plugin size but impacts kibana load performance
    // Please remove async import.
    import('./attachment_types').then(({ registerDashboardAttachmentUiDefinition }) => {
      this.cleanupAttachmentUi = registerDashboardAttachmentUiDefinition({
        agentBuilder: plugins.agentBuilder,
        canWriteDashboards: core.application.capabilities.dashboard_v2?.showWriteControls === true,
        dashboardLocator: plugins.share.url.locators.get(DASHBOARD_APP_LOCATOR),
        unifiedSearch: plugins.unifiedSearch,
        data: plugins.data,
        dashboardPlugin: plugins.dashboard,
      });
    });

    return {};
  }

  public stop() {
    this.cleanupAttachmentUi?.();
  }
}
