/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  mockAssistantAvailability,
  TestProviders,
} from '../../../mock/test_providers/test_providers';
import { SettingsContextMenu } from './settings_context_menu';
import { AI_ASSISTANT_MENU } from './translations';
import { alertConvo, conversationWithContentReferences } from '../../../mock/conversation';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { KNOWLEDGE_BASE_TAB } from '../const';

describe('SettingsContextMenu', () => {
  it('renders an accessible menu button icon', () => {
    render(
      <TestProviders>
        <SettingsContextMenu />
      </TestProviders>
    );

    expect(screen.getByRole('button', { name: AI_ASSISTANT_MENU })).toBeInTheDocument();
  });

  it('renders all menu items', () => {
    render(
      <TestProviders>
        <SettingsContextMenu />
      </TestProviders>
    );

    screen.getByTestId('chat-context-menu').click();
    expect(screen.getByTestId('alerts-to-analyze')).toBeInTheDocument();
    expect(screen.getByTestId('anonymize-values')).toBeInTheDocument();
    expect(screen.getByTestId('show-citations')).toBeInTheDocument();
    expect(screen.getByTestId('clear-chat')).toBeInTheDocument();
  });

  it('triggers the reset conversation modal when clicking RESET_CONVERSATION', () => {
    render(
      <TestProviders>
        <SettingsContextMenu />
      </TestProviders>
    );

    screen.getByTestId('chat-context-menu').click();

    screen.getByTestId('clear-chat').click();
    expect(screen.getByTestId('reset-conversation-modal')).toBeInTheDocument();
  });

  it('disables the anonymize values switch when no anonymized fields are present', () => {
    render(
      <TestProviders>
        <SettingsContextMenu />
      </TestProviders>
    );

    screen.getByTestId('chat-context-menu').click();

    const anonymizeSwitch = screen.getByTestId('anonymize-switch');
    expect(anonymizeSwitch).toBeDisabled();
  });

  it('enables the anonymize values switch when no anonymized fields are present', () => {
    render(
      <TestProviders>
        <SettingsContextMenu selectedConversation={alertConvo} />
      </TestProviders>
    );

    screen.getByTestId('chat-context-menu').click();

    const anonymizeSwitch = screen.getByTestId('anonymize-switch');
    expect(anonymizeSwitch).not.toBeDisabled();
  });

  it('disables the show citations switch when no citations are present', () => {
    render(
      <TestProviders>
        <SettingsContextMenu />
      </TestProviders>
    );

    screen.getByTestId('chat-context-menu').click();

    const citationsSwitch = screen.getByTestId('citations-switch');
    expect(citationsSwitch).toBeDisabled();
  });

  it('enables the show citations switch when no citations are present', () => {
    render(
      <TestProviders>
        <SettingsContextMenu selectedConversation={conversationWithContentReferences} />
      </TestProviders>
    );

    screen.getByTestId('chat-context-menu').click();

    const citationsSwitch = screen.getByTestId('citations-switch');
    expect(citationsSwitch).not.toBeDisabled();
  });

  it('Navigates to AI settings for non-AI4SOC', () => {
    const mockNavigateToApp = jest.fn();
    render(
      <TestProviders providerContext={{ navigateToApp: mockNavigateToApp }}>
        <SettingsContextMenu />
      </TestProviders>
    );

    screen.getByTestId('chat-context-menu').click();

    screen.getByTestId('ai-assistant-settings').click();
    expect(mockNavigateToApp).toHaveBeenCalledWith('management', {
      path: 'kibana/securityAiAssistantManagement',
    });
  });

  it('Navigates to AI settings for AI4SOC', () => {
    const mockNavigateToApp = jest.fn();
    render(
      <TestProviders
        assistantAvailability={{
          ...mockAssistantAvailability,
          hasSearchAILakeConfigurations: true,
        }}
        providerContext={{ navigateToApp: mockNavigateToApp }}
      >
        <SettingsContextMenu />
      </TestProviders>
    );

    screen.getByTestId('chat-context-menu').click();

    screen.getByTestId('ai-assistant-settings').click();
    expect(mockNavigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: SecurityPageName.configurationsAiSettings,
    });
  });

  it('Navigates to Knowledge Base for non-AI4SOC', () => {
    const mockNavigateToApp = jest.fn();
    render(
      <TestProviders providerContext={{ navigateToApp: mockNavigateToApp }}>
        <SettingsContextMenu />
      </TestProviders>
    );

    screen.getByTestId('chat-context-menu').click();

    screen.getByTestId('knowledge-base').click();
    expect(mockNavigateToApp).toHaveBeenCalledWith('management', {
      path: `kibana/securityAiAssistantManagement?tab=${KNOWLEDGE_BASE_TAB}`,
    });
  });

  it('Navigates to Knowledge Base for AI4SOC', () => {
    const mockNavigateToApp = jest.fn();
    render(
      <TestProviders
        assistantAvailability={{
          ...mockAssistantAvailability,
          hasSearchAILakeConfigurations: true,
        }}
        providerContext={{ navigateToApp: mockNavigateToApp }}
      >
        <SettingsContextMenu />
      </TestProviders>
    );

    screen.getByTestId('chat-context-menu').click();

    screen.getByTestId('knowledge-base').click();
    expect(mockNavigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      deepLinkId: SecurityPageName.configurationsAiSettings,
      path: `?tab=${KNOWLEDGE_BASE_TAB}`,
    });
  });
});
