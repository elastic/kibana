/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { Subscription } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
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
  private dashboardAppApiSubscription?: Subscription;
  private dashboardApi?: DashboardApi;

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
    this.dashboardAppApiSubscription = plugins.dashboard.dashboardAppClientApi$.subscribe((api) => {
      this.dashboardApi = api;
    });

    plugins.agentBuilder.attachments.addAttachmentType<DashboardAttachment>(
      DASHBOARD_ATTACHMENT_TYPE,
      async () => {
        const { getDashboardAttachmentUiDefinition } = await import('./attachment_types');
        return getDashboardAttachmentUiDefinition({
          agentBuilder: plugins.agentBuilder,
          dashboardLocator: plugins.share.url.locators.get(DASHBOARD_APP_LOCATOR),
          unifiedSearch: plugins.unifiedSearch,
          dashboardPlugin: plugins.dashboard,
          getDashboardApi: () => this.dashboardApi,
        });
      }
    );

    return {};
  }

  public stop() {
    this.dashboardAppApiSubscription?.unsubscribe();
    this.dashboardApi = undefined;
  }
}
