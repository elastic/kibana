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
} from '@kbn/dashboard-plugin/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import {
  ADD_AI_INSIGHTS_ACTION_ID,
  AI_INSIGHTS_EMBEDDABLE_TYPE,
} from '../common/ai_insights/constants';
import type {
  AgentBuilderDashboardsPluginPublicSetup,
  AgentBuilderDashboardsPluginPublicStart,
  AgentBuilderDashboardsPluginPublicSetupDependencies,
  AgentBuilderDashboardsPluginPublicStartDependencies,
} from './types';
import { createIdGenerator, registerDashboardAttachmentUiDefinition } from './attachment_types';
import { setAiInsightsServices } from './ai_insights/services';

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
    plugins: AgentBuilderDashboardsPluginPublicSetupDependencies
  ): AgentBuilderDashboardsPluginPublicSetup {
    plugins.embeddable.registerEmbeddablePublicDefinition(AI_INSIGHTS_EMBEDDABLE_TYPE, async () => {
      const { aiInsightsEmbeddableFactory } = await import('./ai_insights/ai_insights_embeddable');
      return aiInsightsEmbeddableFactory;
    });

    return {};
  }

  public start(
    core: CoreStart,
    plugins: AgentBuilderDashboardsPluginPublicStartDependencies
  ): AgentBuilderDashboardsPluginPublicStart {
    const draftAttachmentId = createIdGenerator();
    const canWriteDashboards =
      core.application.capabilities.dashboard_v2?.showWriteControls === true;
    const canShowAgentBuilder = core.application.capabilities.agentBuilder?.show === true;

    setAiInsightsServices({
      core,
      openChat: plugins.agentBuilder.openChat,
      draftAttachmentId,
      canShowAgentBuilder,
    });

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

    plugins.uiActions.registerActionAsync<EmbeddableApiContext>(
      ADD_AI_INSIGHTS_ACTION_ID,
      async () => {
        const { getAddAiInsightsAction } = await import('./ai_insights/create_add_panel_action');
        return getAddAiInsightsAction();
      }
    );
    plugins.uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_AI_INSIGHTS_ACTION_ID);

    if (canShowAgentBuilder) {
      plugins.uiActions.registerActionAsync(OPEN_DASHBOARD_CHAT_ACTION_ID, async () => {
        const { createOpenDashboardChatAction } = await import(
          './dashboard_empty_screen/open_dashboard_chat_action'
        );
        return createOpenDashboardChatAction(plugins.agentBuilder.openChat);
      });

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

