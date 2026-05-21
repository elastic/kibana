/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { isToolUiEvent } from '@kbn/agent-builder-common';
import {
  DASHBOARD_PINNED_UI_EVENT,
  type DashboardPinnedUiEventData,
} from '@kbn/dashboard-agent-common';
import type {
  DashboardAgentPluginPublicSetup,
  DashboardAgentPluginPublicStart,
  DashboardAgentPluginPublicSetupDependencies,
  DashboardAgentPluginPublicStartDependencies,
} from './types';
import { registerDashboardAttachmentUiDefinition } from './attachment_types';
import { showPinnedDashboardToast } from './show_pinned_dashboard_toast';

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
  private pinnedToastSubscription?: Subscription;

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
    const locator = plugins.share.url.locators.get(DASHBOARD_APP_LOCATOR);

    this.cleanupAttachmentUi = registerDashboardAttachmentUiDefinition({
      agentBuilder: plugins.agentBuilder,
      chrome: core.chrome,
      canWriteDashboards: core.application.capabilities.dashboard_v2?.showWriteControls === true,
      dashboardLocator: locator,
      unifiedSearch: plugins.unifiedSearch,
      data: plugins.data,
      dashboardPlugin: plugins.dashboard,
    });

    this.pinnedToastSubscription = plugins.agentBuilder.events.chat$.subscribe((event) => {
      if (
        isToolUiEvent<typeof DASHBOARD_PINNED_UI_EVENT, DashboardPinnedUiEventData>(
          event,
          DASHBOARD_PINNED_UI_EVENT
        )
      ) {
        showPinnedDashboardToast({
          dashboardId: event.data.data.dashboardId,
          title: event.data.data.title,
          core,
          locator,
        });
      }
    });

    return {};
  }

  public stop() {
    this.cleanupAttachmentUi?.();
    this.pinnedToastSubscription?.unsubscribe();
  }
}
