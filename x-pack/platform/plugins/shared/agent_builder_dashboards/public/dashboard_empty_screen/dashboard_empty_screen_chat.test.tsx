/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { DashboardEmptyScreenChat } from './dashboard_empty_screen_chat';
import { DashboardAddPanelChatAction } from './dashboard_add_panel_chat';

describe('DashboardEmptyScreenChat', () => {
  const openChat = jest.fn() as jest.MockedFunction<AgentBuilderPluginStart['openChat']>;
  const clearOverlays = jest.fn();

  beforeEach(() => {
    openChat.mockClear();
    clearOverlays.mockClear();
  });

  it.each([
    ['dashboardCreateWithChatMetricsPrompt', 'Create a dashboard for my metrics'],
    ['dashboardCreateWithChatLogsPrompt', 'Build a dashboard to monitor my logs'],
  ])('prefills chat from the %s pill without sending', (testSubject, initialMessage) => {
    render(<DashboardEmptyScreenChat openChat={openChat} />);

    fireEvent.click(screen.getByTestId(testSubject));

    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage,
      autoSendInitialMessage: false,
      sessionTag: 'dashboard',
    });
  });

  it('prefills the default chart prompt from the primary button without sending', async () => {
    const action = new DashboardAddPanelChatAction(openChat);
    await action.execute({
      embeddable: { clearOverlays } as unknown as DashboardApi,
    });

    expect(clearOverlays).toHaveBeenCalledTimes(1);
    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: 'Create a time series chart to see my logs over time',
      autoSendInitialMessage: false,
      sessionTag: 'dashboard',
    });
  });
});
