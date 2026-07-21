/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  OPEN_DASHBOARD_CHAT_ACTION_ID,
  type AddPanelActionExtension,
  type OpenDashboardChatActionContext,
} from '@kbn/dashboard-plugin/public';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';

const defaultPrompt = i18n.translate(
  'xpack.agentBuilderDashboards.addPanelFlyout.defaultPromptDetail',
  {
    defaultMessage: 'Create a time series chart to see my logs over time',
  }
);

export const createOpenDashboardChatAction = (
  openChat: AgentBuilderPluginStart['openChat']
): ActionDefinition<OpenDashboardChatActionContext, AddPanelActionExtension> => ({
  id: OPEN_DASHBOARD_CHAT_ACTION_ID,
  type: OPEN_DASHBOARD_CHAT_ACTION_ID,
  order: 0,
  extension: { isAiAction: true },
  getDisplayName: () =>
    i18n.translate('xpack.agentBuilderDashboards.addPanelFlyout.createWithChatButtonLabel', {
      defaultMessage: 'Create with chat',
    }),
  getDisplayNameTooltip: () =>
    i18n.translate('xpack.agentBuilderDashboards.addPanelFlyout.createWithChatDescription', {
      defaultMessage: 'Let the agent build any panel for you.',
    }),
  getIconType: () => 'productAgent',
  isCompatible: async () => true,
  execute: async ({ initialMessage }) => {
    openChat({
      newConversation: true,
      initialMessage: initialMessage ?? defaultPrompt,
      autoSendInitialMessage: false,
      sessionTag: 'dashboard',
    });
  },
});
