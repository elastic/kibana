/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { userEvent } from '@testing-library/user-event';

import {
  mockAssistantAvailability,
  TestProviders,
} from '../../../mock/test_providers/test_providers';
import { AssistantSettingsContextMenu } from './settings_context_menu';
import { AI_ASSISTANT_MENU } from './translations';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { KNOWLEDGE_BASE_TAB } from '../const';
const props = {};
describe('AssistantSettingsContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders an accessible menu button icon', () => {
    render(
      <TestProviders>
        <AssistantSettingsContextMenu {...props} />
      </TestProviders>
    );

    expect(screen.getByRole('button', { name: AI_ASSISTANT_MENU })).toBeInTheDocument();
  });

  it('renders all menu items', async () => {
    render(
      <TestProviders>
        <AssistantSettingsContextMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('chat-context-menu'));
    expect(screen.getByTestId('alerts-to-analyze')).toBeInTheDocument();
    expect(screen.getByTestId('anonymization')).toBeInTheDocument();
    expect(screen.getByTestId('ai-assistant-settings')).toBeInTheDocument();
    expect(screen.getByTestId('knowledge-base')).toBeInTheDocument();
  });

  it('Navigates to AI settings for non-AI4SOC', async () => {
    const mockNavigateToApp = jest.fn();
    render(
      <TestProviders providerContext={{ navigateToApp: mockNavigateToApp }}>
        <AssistantSettingsContextMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('chat-context-menu'));
    await waitFor(() => expect(screen.getByTestId('ai-assistant-settings')).toBeVisible());
    await userEvent.click(screen.getByTestId('ai-assistant-settings'));
    expect(mockNavigateToApp).toHaveBeenCalledWith('management', {
      path: 'ai/securityAiAssistantManagement',
    });
  });

  it('Navigates to AI settings for AI4SOC', async () => {
    const mockNavigateToApp = jest.fn();
    render(
      <TestProviders
        assistantAvailability={{
          ...mockAssistantAvailability,
          hasSearchAILakeConfigurations: true,
        }}
        providerContext={{ navigateToApp: mockNavigateToApp }}
      >
        <AssistantSettingsContextMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('chat-context-menu'));
    await waitFor(() => expect(screen.getByTestId('ai-assistant-settings')).toBeVisible());

    await userEvent.click(screen.getByTestId('ai-assistant-settings'));
    expect(mockNavigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: SecurityPageName.configurationsAiSettings,
    });
  });

  it('Navigates to Knowledge Base for non-AI4SOC', async () => {
    const mockNavigateToApp = jest.fn();
    render(
      <TestProviders providerContext={{ navigateToApp: mockNavigateToApp }}>
        <AssistantSettingsContextMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('chat-context-menu'));
    await waitFor(() => expect(screen.getByTestId('knowledge-base')).toBeVisible());

    await userEvent.click(screen.getByTestId('knowledge-base'));
    expect(mockNavigateToApp).toHaveBeenCalledWith('management', {
      path: `ai/securityAiAssistantManagement?tab=${KNOWLEDGE_BASE_TAB}`,
    });
  });

  it('Navigates to Knowledge Base for AI4SOC', async () => {
    const mockNavigateToApp = jest.fn();
    render(
      <TestProviders
        assistantAvailability={{
          ...mockAssistantAvailability,
          hasSearchAILakeConfigurations: true,
        }}
        providerContext={{ navigateToApp: mockNavigateToApp }}
      >
        <AssistantSettingsContextMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('chat-context-menu'));
    await waitFor(() => expect(screen.getByTestId('knowledge-base')).toBeVisible());

    await userEvent.click(screen.getByTestId('knowledge-base'));
    expect(mockNavigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: SecurityPageName.configurationsAiSettings,
      path: `?tab=${KNOWLEDGE_BASE_TAB}`,
    });
  });
});
