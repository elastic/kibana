/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { OPEN_DASHBOARD_CHAT_ACTION_ID } from '@kbn/dashboard-plugin/public';
import { createOpenDashboardChatAction } from './open_dashboard_chat_action';

describe('createOpenDashboardChatAction', () => {
  const openChat = jest.fn() as jest.MockedFunction<AgentBuilderPluginStart['openChat']>;

  beforeEach(() => {
    openChat.mockClear();
  });

  it('declares the AiButton extension treatment', () => {
    const action = createOpenDashboardChatAction(openChat);

    expect(action.extension).toEqual({ isAiButton: true });
  });

  it('uses the agent icon and Create with chat label', () => {
    const action = createOpenDashboardChatAction(openChat);

    expect(action.getIconType?.()).toBe('productAgent');
    expect(action.getDisplayName?.()).toBe('Create with chat');
  });

  it('is compatible', async () => {
    const action = createOpenDashboardChatAction(openChat);

    await expect(
      action.isCompatible?.({
        initialMessage: 'Create a dashboard',
        trigger: { id: OPEN_DASHBOARD_CHAT_ACTION_ID },
      })
    ).resolves.toBe(true);
  });

  it('opens Chat with the provided prompt without sending', async () => {
    const action = createOpenDashboardChatAction(openChat);

    await action.execute({
      initialMessage: 'Create a dashboard',
      trigger: { id: OPEN_DASHBOARD_CHAT_ACTION_ID },
    });

    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: 'Create a dashboard',
      autoSendInitialMessage: false,
      sessionTag: 'dashboard',
    });
  });

  it('prefills chat with the default chart prompt when none is provided', async () => {
    const action = createOpenDashboardChatAction(openChat);

    await action.execute({
      trigger: { id: OPEN_DASHBOARD_CHAT_ACTION_ID },
    });

    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: 'Create a time series chart to see my logs over time',
      autoSendInitialMessage: false,
      sessionTag: 'dashboard',
    });
  });
});
