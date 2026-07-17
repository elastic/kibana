/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { OpenDashboardChatAction } from './open_dashboard_chat_action';

describe('OpenDashboardChatAction', () => {
  const openChat = jest.fn() as jest.MockedFunction<AgentBuilderPluginStart['openChat']>;

  beforeEach(() => {
    openChat.mockClear();
  });

  it('declares the highlighted extension treatment', () => {
    const action = new OpenDashboardChatAction(openChat);

    expect(action.extension).toEqual({ isHighlighted: true });
  });

  it('uses the agent icon and Create with chat label', () => {
    const action = new OpenDashboardChatAction(openChat);

    expect(action.getIconType()).toBe('productAgent');
    expect(action.getDisplayName()).toBe('Create with chat');
  });

  it('is compatible', async () => {
    const action = new OpenDashboardChatAction(openChat);

    await expect(
      action.isCompatible({
        initialMessage: 'Create a dashboard',
        trigger: { id: 'openDashboardChat' },
      })
    ).resolves.toBe(true);
  });

  it('opens Chat with the provided prompt without sending', async () => {
    const action = new OpenDashboardChatAction(openChat);

    await action.execute({
      initialMessage: 'Create a dashboard',
      trigger: { id: 'openDashboardChat' },
    });

    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: 'Create a dashboard',
      autoSendInitialMessage: false,
      sessionTag: 'dashboard',
    });
  });

  it('prefills chat with the default chart prompt when none is provided', async () => {
    const action = new OpenDashboardChatAction(openChat);

    await action.execute({
      trigger: { id: 'openDashboardChat' },
    });

    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: 'Create a time series chart to see my logs over time',
      autoSendInitialMessage: false,
      sessionTag: 'dashboard',
    });
  });
});
