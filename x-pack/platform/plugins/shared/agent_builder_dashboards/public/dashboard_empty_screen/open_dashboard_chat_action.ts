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
  type OpenDashboardChatActionContext,
} from '@kbn/dashboard-plugin/public';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';

export const createOpenDashboardChatAction = (
  openChat: AgentBuilderPluginStart['openChat']
): ActionDefinition<OpenDashboardChatActionContext> => ({
  id: OPEN_DASHBOARD_CHAT_ACTION_ID,
  type: OPEN_DASHBOARD_CHAT_ACTION_ID,
  order: 0,
  getDisplayName: () =>
    i18n.translate('xpack.agentBuilderDashboards.addPanelFlyout.createWithChatButtonLabel', {
      defaultMessage: 'Create with chat',
    }),
  getDisplayNameTooltip: () =>
    i18n.translate('xpack.agentBuilderDashboards.addPanelFlyout.createWithChatDescription', {
      defaultMessage: 'Build any panel using an agent.',
    }),
  getIconType: () => 'productAgent',
  isCompatible: async () => true,
  execute: async ({ initialMessage }) => {
    openChat({
      newConversation: true,
      // Omit / undefined / empty all open a blank editor. Prompt pills pass an explicit message.
      initialMessage: initialMessage ?? '',
      autoSendInitialMessage: false,
      sessionTag: 'dashboard',
    });
  },
});
