/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { welcomeConvo } from '../../mock/conversation';
import { useAssistantContext } from '../../assistant_context';
import { fireEvent, render, act } from '@testing-library/react';
import { AssistantSettings } from './assistant_settings';
import React from 'react';
import { OpenAiProviderType } from '@kbn/connector-schemas/openai';
import { MOCK_QUICK_PROMPTS } from '../../mock/quick_prompt';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { QUICK_PROMPTS_TAB, SYSTEM_PROMPTS_TAB } from './const';

const mockSystemUpdater = {
  onConversationSelectionChange: vi.fn(),
  onNewConversationDefaultChange: vi.fn(),
  onPromptContentChange: vi.fn(),
  onSystemPromptDelete: vi.fn(),
  onSystemPromptSelect: vi.fn(),
  refetchSystemPromptConversations: vi.fn(),
  resetSystemPromptSettings: vi.fn(),
  saveSystemPromptSettings: vi
    .fn()
    .mockResolvedValue({ success: true, conversationUpdates: { updates: [] } }),
  selectedSystemPrompt: undefined,
  systemPromptSettings: [],
};

const mockQuickUpdater = {
  onPromptContentChange: vi.fn(),
  onQuickPromptColorChange: vi.fn(),
  onQuickPromptContextChange: vi.fn(),
  onQuickPromptDelete: vi.fn(),
  onQuickPromptSelect: vi.fn(),
  quickPromptSettings: [],
  resetQuickPromptSettings: vi.fn(),
  saveQuickPromptSettings: vi.fn(),
  selectedQuickPrompt: undefined,
};
const mockConversationsUpdater = {
  resetConversationsSettings: vi.fn(),
  saveConversationsSettings: vi.fn(),
  setConversationsSettingsBulkActions: vi.fn(),
  conversationsSettingsBulkActions: {},
};

const setSelectedSettingsTab = vi.fn();
const mockContext = {
  basePromptContexts: MOCK_QUICK_PROMPTS,
  setSelectedSettingsTab,
  http: {},
  selectedSettingsTab: QUICK_PROMPTS_TAB,
  assistantAvailability: {
    isAssistantEnabled: true,
  },
};
const onClose = vi.fn();
const onSave = vi.fn().mockResolvedValue(() => {});
const onConversationSelected = vi.fn();

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
  refetchAnonymizationFieldsResults: vi.fn(),
  setPaginationObserver: vi.fn(),
};
vi.mock('../../assistant_context');
vi.mock('@kbn/inference-connectors', () => {
  const mocked = {
    useLoadConnectors: vi.fn(() => {
      return {
        data: [],
        error: null,
        isSuccess: true,
      };
    }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./use_settings_updater/use_conversations_updater', async () => {
  const original = await vi.importActual('./use_settings_updater/use_conversations_updater');
  return {
    ...original,
    useConversationsUpdater: vi.fn().mockImplementation(() => mockConversationsUpdater),
  };
});
vi.mock('./use_settings_updater/use_system_prompt_updater', async () => {
  const original = await vi.importActual('./use_settings_updater/use_system_prompt_updater');
  return {
    ...original,
    useSystemPromptUpdater: vi.fn().mockImplementation(() => mockSystemUpdater),
  };
});
vi.mock('./use_settings_updater/use_quick_prompt_updater', async () => {
  const original = await vi.importActual('./use_settings_updater/use_quick_prompt_updater');
  return {
    ...original,
    useQuickPromptUpdater: vi.fn().mockImplementation(() => mockQuickUpdater),
  };
});
vi.mock('.', () => {
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
    vi.clearAllMocks();
    (useAssistantContext as Mock).mockImplementation(() => mockContext);
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
    (useAssistantContext as Mock).mockImplementation(() => ({
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
      (useAssistantContext as Mock).mockImplementation(() => ({
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
