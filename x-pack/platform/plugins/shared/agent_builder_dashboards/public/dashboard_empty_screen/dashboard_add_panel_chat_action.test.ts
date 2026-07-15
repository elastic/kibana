/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { DashboardAddPanelChatAction } from './dashboard_add_panel_chat_action';

describe('DashboardAddPanelChatAction', () => {
  const openChat = jest.fn() as jest.MockedFunction<AgentBuilderPluginStart['openChat']>;

  beforeEach(() => {
    openChat.mockClear();
  });

  it('declares the highlighted extension treatment', () => {
    const action = new DashboardAddPanelChatAction(openChat);

    expect(action.extension).toEqual({ isHighlighted: true });
  });

  it('uses the agent icon', () => {
    const action = new DashboardAddPanelChatAction(openChat);

    expect(action.getIconType()).toBe('productAgent');
  });

  it('prefills chat with the default chart prompt without sending', async () => {
    const action = new DashboardAddPanelChatAction(openChat);

    await action.execute();

    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: 'Create a time series chart to see my logs over time',
      autoSendInitialMessage: false,
      sessionTag: 'dashboard',
    });
  });
});
