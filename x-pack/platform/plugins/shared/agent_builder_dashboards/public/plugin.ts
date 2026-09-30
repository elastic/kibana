/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import {
  OPEN_DASHBOARD_CHAT_ACTION_ID,
  ENHANCE_DASHBOARD_ACTION_ID,
  REFINE_WITH_CHAT_ACTION_ID,
} from '@kbn/dashboard-plugin/public';
import { ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type {
  AgentBuilderDashboardsPluginPublicSetup,
  AgentBuilderDashboardsPluginPublicStart,
  AgentBuilderDashboardsPluginPublicSetupDependencies,
  AgentBuilderDashboardsPluginPublicStartDependencies,
} from './types';
import {
  createIdGenerator,
  registerDashboardAttachmentUiDefinition,
  registerDashboardPanelAttachmentUiDefinition,
} from './attachment_types';
import { registerAgentBuilderDashboardsAnalyticsEvents } from './telemetry';

export class AgentBuilderDashboardsPlugin
  implements
    Plugin<
      AgentBuilderDashboardsPluginPublicSetup,
      AgentBuilderDashboardsPluginPublicStart,
      AgentBuilderDashboardsPluginPublicSetupDependencies,
      AgentBuilderDashboardsPluginPublicStartDependencies
    >
{
  private cleanupAttachmentUi?: () => void;

  constructor(_initContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<
      AgentBuilderDashboardsPluginPublicStartDependencies,
      AgentBuilderDashboardsPluginPublicStart
    >,
    _plugins: AgentBuilderDashboardsPluginPublicSetupDependencies
  ): AgentBuilderDashboardsPluginPublicSetup {
    registerAgentBuilderDashboardsAnalyticsEvents(core.analytics);
    return {};
  }

  public start(
    core: CoreStart,
    plugins: AgentBuilderDashboardsPluginPublicStartDependencies
  ): AgentBuilderDashboardsPluginPublicStart {
    const draftAttachmentId = createIdGenerator();
    const canWriteDashboards =
      core.application.capabilities.dashboard_v2?.showWriteControls === true;

    this.cleanupAttachmentUi = registerDashboardAttachmentUiDefinition({
      agentBuilder: plugins.agentBuilder,
      chrome: core.chrome,
      canWriteDashboards,
      dashboardLocator: plugins.share.url.locators.get(DASHBOARD_APP_LOCATOR),
      unifiedSearch: plugins.unifiedSearch,
      data: plugins.data,
      dashboardPlugin: plugins.dashboard,
      draftAttachmentId,
    });
    registerDashboardPanelAttachmentUiDefinition(plugins.agentBuilder);

    if (core.application.capabilities.agentBuilder?.show === true) {
      plugins.uiActions.registerActionAsync(OPEN_DASHBOARD_CHAT_ACTION_ID, async () => {
        const { createOpenDashboardChatAction } = await import(
          './dashboard_empty_screen/open_dashboard_chat_action'
        );
        return createOpenDashboardChatAction(plugins.agentBuilder.openChat);
      });

      plugins.uiActions.registerActionAsync(REFINE_WITH_CHAT_ACTION_ID, async () => {
        const { createRefineWithChatAction } = await import(
          './refine_with_chat/refine_with_chat_action'
        );
        return createRefineWithChatAction({
          agentBuilder: plugins.agentBuilder,
          analytics: core.analytics,
          dashboardAppApi$: plugins.dashboard.dashboardAppClientApi$,
          canWriteDashboards,
          draftAttachmentId,
        });
      });
      plugins.uiActions.attachAction(ON_OPEN_PANEL_MENU, REFINE_WITH_CHAT_ACTION_ID);

      plugins.uiActions.registerActionAsync(ENHANCE_DASHBOARD_ACTION_ID, async () => {
        const { createEnhanceDashboardAction } = await import('./enhance/enhance_dashboard_action');
        return createEnhanceDashboardAction({
          openChat: plugins.agentBuilder.openChat,
          getAgentBuilderAccess: plugins.agentBuilder.getAgentBuilderAccess,
          canWriteDashboards,
          draftAttachmentId,
        });
      });
    }

    return {};
  }

  public stop() {
    this.cleanupAttachmentUi?.();
  }
}
