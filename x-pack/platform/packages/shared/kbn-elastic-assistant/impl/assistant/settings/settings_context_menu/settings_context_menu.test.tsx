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
import { AI_ASSISTANT_MENU, TRY_AI_AGENT, AI_AGENT_SWITCH_ERROR } from './translations';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { KNOWLEDGE_BASE_TAB } from '../const';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { IToasts } from '@kbn/core-notifications-browser';

jest.mock('@kbn/ai-agent-confirmation-modal', () => ({
  AIAgentConfirmationModal: ({
    onConfirm,
    onCancel,
  }: {
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
  }) => (
    <div data-test-subj="ai-agent-confirmation-modal">
      <button
        type="button"
        onClick={async () => {
          await onConfirm();
        }}
        data-test-subj="confirm-ai-agent"
      >
        {'Confirm'}
      </button>
      <button type="button" onClick={onCancel} data-test-subj="cancel-ai-agent">
        {'Cancel'}
      </button>
    </div>
  ),
}));

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

  it('renders Try AI Agent button in menu', async () => {
    render(
      <TestProviders>
        <AssistantSettingsContextMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('chat-context-menu'));
    await waitFor(() => expect(screen.getByTestId('try-ai-agent')).toBeVisible());
    expect(screen.getByRole('button', { name: TRY_AI_AGENT })).toBeInTheDocument();
  });

  it('opens AI Agent confirmation modal when Try AI Agent button is clicked', async () => {
    render(
      <TestProviders>
        <AssistantSettingsContextMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('chat-context-menu'));
    await waitFor(() => expect(screen.getByTestId('try-ai-agent')).toBeVisible());
    await userEvent.click(screen.getByTestId('try-ai-agent'));

    await waitFor(() => {
      expect(screen.getByTestId('ai-agent-confirmation-modal')).toBeInTheDocument();
    });
  });

  it('closes popover when Try AI Agent button is clicked', async () => {
    render(
      <TestProviders>
        <AssistantSettingsContextMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('chat-context-menu'));
    await waitFor(() => expect(screen.getByTestId('try-ai-agent')).toBeVisible());
    await userEvent.click(screen.getByTestId('try-ai-agent'));

    await waitFor(() => {
      expect(screen.queryByTestId('ai-assistant-settings')).not.toBeVisible();
    });
  });

  it('renders confirm and cancel buttons in AI Agent confirmation modal', async () => {
    render(
      <TestProviders>
        <AssistantSettingsContextMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('chat-context-menu'));
    await waitFor(() => expect(screen.getByTestId('try-ai-agent')).toBeVisible());
    await userEvent.click(screen.getByTestId('try-ai-agent'));

    await waitFor(() => {
      expect(screen.getByTestId('ai-agent-confirmation-modal')).toBeInTheDocument();
    });

    expect(screen.getByTestId('confirm-ai-agent')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-ai-agent')).toBeInTheDocument();
  });

  it('closes modal when cancel is clicked', async () => {
    render(
      <TestProviders>
        <AssistantSettingsContextMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('chat-context-menu'));
    await waitFor(() => expect(screen.getByTestId('try-ai-agent')).toBeVisible());
    await userEvent.click(screen.getByTestId('try-ai-agent'));

    await waitFor(() => {
      expect(screen.getByTestId('ai-agent-confirmation-modal')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('cancel-ai-agent'));

    await waitFor(() => {
      expect(screen.queryByTestId('ai-agent-confirmation-modal')).not.toBeInTheDocument();
    });
  });

  it('shows error toast when settings.client.set fails', async () => {
    const mockSet = jest.fn().mockRejectedValue(new Error('Failed to set setting'));
    const mockAddError = jest.fn();
    render(
      <TestProviders
        providerContext={{
          settings: {
            client: {
              get: jest.fn(),
              set: mockSet,
            },
          } as unknown as SettingsStart,
          toasts: {
            addError: mockAddError,
          } as unknown as IToasts,
        }}
      >
        <AssistantSettingsContextMenu {...props} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('chat-context-menu'));
    await waitFor(() => expect(screen.getByTestId('try-ai-agent')).toBeVisible());
    await userEvent.click(screen.getByTestId('try-ai-agent'));

    await waitFor(() => {
      expect(screen.getByTestId('ai-agent-confirmation-modal')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('confirm-ai-agent'));

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          title: AI_AGENT_SWITCH_ERROR,
        })
      );
    });
  });

  describe('hasAgentBuilderManagePrivilege', () => {
    it('enables try-ai-agent button when hasAgentBuilderManagePrivilege is true', async () => {
      render(
        <TestProviders>
          <AssistantSettingsContextMenu {...props} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('chat-context-menu'));
      const tryAiAgentButton = screen.getByTestId('try-ai-agent');
      expect(tryAiAgentButton).not.toBeDisabled();
    });

    it('disables try-ai-agent button when hasAgentBuilderManagePrivilege is false', async () => {
      render(
        <TestProviders
          assistantAvailability={{
            ...mockAssistantAvailability,
            hasAgentBuilderManagePrivilege: false,
          }}
        >
          <AssistantSettingsContextMenu {...props} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('chat-context-menu'));
      const tryAiAgentButton = screen.getByTestId('try-ai-agent');
      expect(tryAiAgentButton).toBeDisabled();
    });
  });
});
