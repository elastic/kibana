/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { welcomeConvo } from '../../mock/conversation';
import { useAssistantContext } from '../../assistant_context';
import { fireEvent, render, act } from '@testing-library/react';
import { AssistantSettings } from './assistant_settings';
import React from 'react';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { MOCK_QUICK_PROMPTS } from '../../mock/quick_prompt';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QUICK_PROMPTS_TAB, SYSTEM_PROMPTS_TAB } from './const';

const mockSystemUpdater = {
  onConversationSelectionChange: jest.fn(),
  onNewConversationDefaultChange: jest.fn(),
  onPromptContentChange: jest.fn(),
  onSystemPromptDelete: jest.fn(),
  onSystemPromptSelect: jest.fn(),
  refetchSystemPromptConversations: jest.fn(),
  resetSystemPromptSettings: jest.fn(),
  saveSystemPromptSettings: jest
    .fn()
    .mockResolvedValue({ success: true, conversationUpdates: { updates: [] } }),
  selectedSystemPrompt: undefined,
  systemPromptSettings: [],
};

const mockQuickUpdater = {
  onPromptContentChange: jest.fn(),
  onQuickPromptColorChange: jest.fn(),
  onQuickPromptContextChange: jest.fn(),
  onQuickPromptDelete: jest.fn(),
  onQuickPromptSelect: jest.fn(),
  quickPromptSettings: [],
  resetQuickPromptSettings: jest.fn(),
  saveQuickPromptSettings: jest.fn(),
  selectedQuickPrompt: undefined,
};
const mockConversationsUpdater = {
  resetConversationsSettings: jest.fn(),
  saveConversationsSettings: jest.fn(),
  setConversationsSettingsBulkActions: jest.fn(),
  conversationsSettingsBulkActions: {},
};

const setSelectedSettingsTab = jest.fn();
const mockContext = {
  basePromptContexts: MOCK_QUICK_PROMPTS,
  setSelectedSettingsTab,
  http: {},
  selectedSettingsTab: QUICK_PROMPTS_TAB,
  assistantAvailability: {
    isAssistantEnabled: true,
  },
};
const onClose = jest.fn();
const onSave = jest.fn().mockResolvedValue(() => {});
const onConversationSelected = jest.fn();

const testProps = {
  conversationsLoaded: true,
  defaultConnectorId: '123',
  defaultProvider: OpenAiProviderType.OpenAi,
  selectedConversationId: welcomeConvo.title,
  onClose,
  onSave,
  onConversationSelected,
  conversations: {},
  anonymizationFields: { total: 0, page: 1, perPage: 1000, data: [] },
  refetchAnonymizationFieldsResults: jest.fn(),
  setPaginationObserver: jest.fn(),
};
jest.mock('../../assistant_context');
jest.mock('../../..', () => ({
  useLoadConnectors: jest.fn(() => {
    return {
      data: [],
      error: null,
      isSuccess: true,
    };
  }),
}));
jest.mock('./use_settings_updater/use_conversations_updater', () => {
  const original = jest.requireActual('./use_settings_updater/use_conversations_updater');
  return {
    ...original,
    useConversationsUpdater: jest.fn().mockImplementation(() => mockConversationsUpdater),
  };
});
jest.mock('./use_settings_updater/use_system_prompt_updater', () => {
  const original = jest.requireActual('./use_settings_updater/use_system_prompt_updater');
  return {
    ...original,
    useSystemPromptUpdater: jest.fn().mockImplementation(() => mockSystemUpdater),
  };
});
jest.mock('./use_settings_updater/use_quick_prompt_updater', () => {
  const original = jest.requireActual('./use_settings_updater/use_quick_prompt_updater');
  return {
    ...original,
    useQuickPromptUpdater: jest.fn().mockImplementation(() => mockQuickUpdater),
  };
});
jest.mock('.', () => {
  return {
    QuickPromptSettings: () => <span data-test-subj="quick_prompts-tab" />,
    SystemPromptSettings: () => <span data-test-subj="system_prompts-tab" />,
  };
});

const queryClient = new QueryClient();

const wrapper = (props: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
);

describe('AssistantSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAssistantContext as jest.Mock).mockImplementation(() => mockContext);
  });

  it('saves changes to quick prompts', async () => {
    const { getByTestId } = render(<AssistantSettings {...testProps} />, {
      wrapper,
    });

    await act(async () => {
      fireEvent.click(getByTestId('save-button'));
    });
    expect(onSave).toHaveBeenCalled();
    expect(mockQuickUpdater.saveQuickPromptSettings).toHaveBeenCalled();
  });

  it('saves changes to system prompts', async () => {
    (useAssistantContext as jest.Mock).mockImplementation(() => ({
      ...mockContext,
      selectedSettingsTab: SYSTEM_PROMPTS_TAB,
    }));

    const { getByTestId } = render(<AssistantSettings {...testProps} />, {
      wrapper,
    });

    await act(async () => {
      fireEvent.click(getByTestId('save-button'));
    });
    expect(onSave).toHaveBeenCalled();
    expect(mockSystemUpdater.saveSystemPromptSettings).toHaveBeenCalled();
    expect(mockConversationsUpdater.saveConversationsSettings).toHaveBeenCalledWith({
      bulkActions: {
        updates: [],
      },
    });
  });

  it('on close is called when settings modal closes', () => {
    const { getByTestId } = render(<AssistantSettings {...testProps} />, {
      wrapper,
    });
    fireEvent.click(getByTestId('cancel-button'));
    expect(onClose).toHaveBeenCalled();
  });

  describe.each([QUICK_PROMPTS_TAB, SYSTEM_PROMPTS_TAB])('%s', (tab) => {
    it('renders with the correct tab open', () => {
      (useAssistantContext as jest.Mock).mockImplementation(() => ({
        ...mockContext,
        selectedSettingsTab: tab,
      }));
      const { getByTestId } = render(<AssistantSettings {...testProps} />, {
        wrapper,
      });
      expect(getByTestId(`${tab}-tab`)).toBeInTheDocument();
    });
  });
});
