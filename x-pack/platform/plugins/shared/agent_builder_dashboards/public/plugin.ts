/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { OPEN_DASHBOARD_CHAT_ACTION_ID } from '@kbn/dashboard-plugin/public';
import type {
  AgentBuilderDashboardsPluginPublicSetup,
  AgentBuilderDashboardsPluginPublicStart,
  AgentBuilderDashboardsPluginPublicSetupDependencies,
  AgentBuilderDashboardsPluginPublicStartDependencies,
} from './types';
import { createIdGenerator, registerDashboardAttachmentUiDefinition } from './attachment_types';
import { registerPrettifyAppMenuItem } from './attachment_types/register_prettify_app_menu_item';

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
  private cleanupPrettifyMenuItem?: () => void;

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
    const draftAttachmentId = createIdGenerator();

    this.cleanupAttachmentUi = registerDashboardAttachmentUiDefinition({
      agentBuilder: plugins.agentBuilder,
      chrome: core.chrome,
      canWriteDashboards: core.application.capabilities.dashboard_v2?.showWriteControls === true,
      dashboardLocator: plugins.share.url.locators.get(DASHBOARD_APP_LOCATOR),
      unifiedSearch: plugins.unifiedSearch,
      data: plugins.data,
      dashboardPlugin: plugins.dashboard,
      draftAttachmentId,
      files: plugins.files,
    });

    this.cleanupPrettifyMenuItem = registerPrettifyAppMenuItem({
      dashboard: plugins.dashboard,
      agentBuilder: plugins.agentBuilder,
      draftAttachmentId,
      files: plugins.files,
    });

    if (core.application.capabilities.agentBuilder?.show === true) {
      plugins.uiActions.registerActionAsync(OPEN_DASHBOARD_CHAT_ACTION_ID, async () => {
        const { createOpenDashboardChatAction } = await import(
          './dashboard_empty_screen/open_dashboard_chat_action'
        );
        return createOpenDashboardChatAction(plugins.agentBuilder.openChat);
      });
    }

    return {};
  }

  public stop() {
    this.cleanupAttachmentUi?.();
    this.cleanupPrettifyMenuItem?.();
  }
}
