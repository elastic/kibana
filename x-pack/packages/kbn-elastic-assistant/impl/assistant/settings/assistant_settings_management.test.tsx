/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertConvo, welcomeConvo } from '../../mock/conversation';
import { useAssistantContext } from '../../assistant_context';
import { fireEvent, render } from '@testing-library/react';

import React from 'react';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { MOCK_QUICK_PROMPTS } from '../../mock/quick_prompt';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssistantSettingsManagement } from './assistant_settings_management';
import {
  ANONYMIZATION_TAB,
  CONNECTORS_TAB,
  CONVERSATIONS_TAB,
  EVALUATION_TAB,
  KNOWLEDGE_BASE_TAB,
  QUICK_PROMPTS_TAB,
  SYSTEM_PROMPTS_TAB,
} from './const';
import { mockSystemPrompts } from '../../mock/system_prompt';

const mockConversations = {
  [alertConvo.title]: alertConvo,
  [welcomeConvo.title]: welcomeConvo,
};
const saveSettings = jest.fn();

const mockValues = {
  conversationSettings: mockConversations,
  saveSettings,
  systemPromptSettings: mockSystemPrompts,
  quickPromptSettings: [],
};

const setSelectedSettingsTab = jest.fn();
const mockContext = {
  basePromptContexts: MOCK_QUICK_PROMPTS,
  setSelectedSettingsTab,
  http: {
    get: jest.fn(),
  },
  assistantFeatures: { assistantModelEvaluation: true },
  selectedSettingsTab: null,
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
  selectedConversation: welcomeConvo,
  onClose,
  onSave,
  onConversationSelected,
  conversations: {},
  anonymizationFields: { total: 0, page: 1, perPage: 1000, data: [] },
  refetchAnonymizationFieldsResults: jest.fn(),
  refetchConversations: jest.fn(),
};
jest.mock('../../assistant_context');

jest.mock('../../connectorland/connector_settings_management', () => ({
  ConnectorsSettingsManagement: () => <span data-test-subj="CONNECTORS_TAB-tab" />,
}));

jest.mock('../conversations/conversation_settings_management', () => ({
  ConversationSettingsManagement: () => <span data-test-subj="CONVERSATIONS_TAB-tab" />,
}));

jest.mock('../quick_prompts/quick_prompt_settings_management', () => ({
  QuickPromptSettingsManagement: () => <span data-test-subj="QUICK_PROMPTS_TAB-tab" />,
}));

jest.mock('../prompt_editor/system_prompt/system_prompt_settings_management', () => ({
  SystemPromptSettingsManagement: () => <span data-test-subj="SYSTEM_PROMPTS_TAB-tab" />,
}));

jest.mock('../../data_anonymization/settings/anonymization_settings_management', () => ({
  AnonymizationSettingsManagement: () => <span data-test-subj="ANONYMIZATION_TAB-tab" />,
}));

jest.mock('.', () => {
  return {
    EvaluationSettings: () => <span data-test-subj="EVALUATION_TAB-tab" />,
    KnowledgeBaseSettings: () => <span data-test-subj="KNOWLEDGE_BASE_TAB-tab" />,
  };
});

jest.mock('./use_settings_updater/use_settings_updater', () => {
  const original = jest.requireActual('./use_settings_updater/use_settings_updater');
  return {
    ...original,
    useSettingsUpdater: jest.fn().mockImplementation(() => mockValues),
  };
});

const queryClient = new QueryClient();

const wrapper = (props: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
);

describe('AssistantSettingsManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAssistantContext as jest.Mock).mockImplementation(() => mockContext);
  });

  it('Bottom bar is hidden when no pending changes', async () => {
    const { queryByTestId } = render(<AssistantSettingsManagement {...testProps} />, {
      wrapper,
    });

    expect(queryByTestId(`bottom-bar`)).not.toBeInTheDocument();
  });

  describe.each([
    CONNECTORS_TAB,
    ANONYMIZATION_TAB,
    CONVERSATIONS_TAB,
    EVALUATION_TAB,
    KNOWLEDGE_BASE_TAB,
    QUICK_PROMPTS_TAB,
    SYSTEM_PROMPTS_TAB,
  ])('%s', (tab) => {
    it('Opens the tab on button click', () => {
      (useAssistantContext as jest.Mock).mockImplementation(() => ({
        ...mockContext,
        selectedSettingsTab: tab,
      }));
      const { getByTestId } = render(<AssistantSettingsManagement {...testProps} />, {
        wrapper,
      });
      fireEvent.click(getByTestId(`settingsPageTab-${tab}`));
      expect(setSelectedSettingsTab).toHaveBeenCalledWith(tab);
    });
    it('renders with the correct tab open', () => {
      (useAssistantContext as jest.Mock).mockImplementation(() => ({
        ...mockContext,
        selectedSettingsTab: tab,
      }));
      const { getByTestId } = render(<AssistantSettingsManagement {...testProps} />, {
        wrapper,
      });
      expect(getByTestId(`${tab}-tab`)).toBeInTheDocument();
    });
  });
});
