/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { OPEN_DASHBOARD_CHAT_ACTION_ID } from '@kbn/dashboard-plugin/public';
import { FEATURED_ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type {
  AgentBuilderDashboardsPluginPublicSetup,
  AgentBuilderDashboardsPluginPublicStart,
  AgentBuilderDashboardsPluginPublicSetupDependencies,
  AgentBuilderDashboardsPluginPublicStartDependencies,
} from './types';
import { registerDashboardAttachmentUiDefinition } from './attachment_types';
import {
  ACTION_CREATE_DASHBOARD_WITH_CHAT,
  DashboardAddPanelChatAction,
} from './dashboard_empty_screen/dashboard_add_panel_chat_action';
import { OpenDashboardChatAction } from './dashboard_empty_screen/open_dashboard_chat_action';

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
    _core: CoreSetup<
      AgentBuilderDashboardsPluginPublicStartDependencies,
      AgentBuilderDashboardsPluginPublicStart
    >,
    _plugins: AgentBuilderDashboardsPluginPublicSetupDependencies
  ): AgentBuilderDashboardsPluginPublicSetup {
    return {};
  }

  public start(
    core: CoreStart,
    plugins: AgentBuilderDashboardsPluginPublicStartDependencies
  ): AgentBuilderDashboardsPluginPublicStart {
    this.cleanupAttachmentUi = registerDashboardAttachmentUiDefinition({
      agentBuilder: plugins.agentBuilder,
      chrome: core.chrome,
      canWriteDashboards: core.application.capabilities.dashboard_v2?.showWriteControls === true,
      dashboardLocator: plugins.share.url.locators.get(DASHBOARD_APP_LOCATOR),
      unifiedSearch: plugins.unifiedSearch,
      data: plugins.data,
      dashboardPlugin: plugins.dashboard,
    });

    if (core.application.capabilities.agentBuilder?.show === true) {
      plugins.uiActions.addTriggerActionAsync(
        FEATURED_ADD_PANEL_TRIGGER,
        ACTION_CREATE_DASHBOARD_WITH_CHAT,
        async () => new DashboardAddPanelChatAction(plugins.agentBuilder.openChat)
      );
      plugins.uiActions.registerActionAsync(
        OPEN_DASHBOARD_CHAT_ACTION_ID,
        async () => new OpenDashboardChatAction(plugins.agentBuilder.openChat)
      );
    }

    return {};
  }

  public stop() {
    this.cleanupAttachmentUi?.();
  }
}
