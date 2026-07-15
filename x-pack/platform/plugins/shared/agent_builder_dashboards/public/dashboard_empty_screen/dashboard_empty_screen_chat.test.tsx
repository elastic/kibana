/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { DashboardEmptyScreenChat } from './dashboard_empty_screen_chat';

describe('DashboardEmptyScreenChat', () => {
  const openChat = jest.fn() as jest.MockedFunction<AgentBuilderPluginStart['openChat']>;

  beforeEach(() => {
    openChat.mockClear();
  });

  const renderComponent = () =>
    render(
      <EuiThemeProvider>
        <DashboardEmptyScreenChat openChat={openChat} />
      </EuiThemeProvider>
    );

  it('renders the annotated Chat title and button suggestions', () => {
    const { container } = renderComponent();

    expect(screen.getByText('Create with Chat')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="productAgent"]')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="sparkles"]')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboardCreateWithChatMetricsPrompt')).toHaveClass('euiButton');
    expect(screen.getByTestId('dashboardCreateWithChatLogsPrompt')).toHaveClass('euiButton');
  });

  it.each([
    ['dashboardCreateWithChatMetricsPrompt', 'Create a dashboard for my metrics'],
    ['dashboardCreateWithChatLogsPrompt', 'Build a dashboard to monitor my logs'],
  ])('prefills chat from the %s pill without sending', (testSubject, initialMessage) => {
    renderComponent();

    fireEvent.click(screen.getByTestId(testSubject));

    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage,
      autoSendInitialMessage: false,
      sessionTag: 'dashboard',
    });
  });
});
