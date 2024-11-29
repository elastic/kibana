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
import { I18nProvider } from '@kbn/i18n-react';
import { MOCK_QUICK_PROMPTS } from '../../mock/quick_prompt';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssistantSettingsManagement } from './assistant_settings_management';

import {
  CONNECTORS_TAB,
  ANONYMIZATION_TAB,
  CONVERSATIONS_TAB,
  EVALUATION_TAB,
  KNOWLEDGE_BASE_TAB,
  QUICK_PROMPTS_TAB,
  SYSTEM_PROMPTS_TAB,
} from './const';
import { mockSystemPrompts } from '../../mock/system_prompt';
import { DataViewsContract } from '@kbn/data-views-plugin/public';

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

const mockContext = {
  basePromptContexts: MOCK_QUICK_PROMPTS,
  http: {
    get: jest.fn(),
  },
  assistantFeatures: { assistantModelEvaluation: true },
  assistantAvailability: {
    isAssistantEnabled: true,
  },
};

const mockDataViews = {
  getIndices: jest.fn(),
} as unknown as DataViewsContract;

const onTabChange = jest.fn();
const testProps = {
  selectedConversation: welcomeConvo,
  dataViews: mockDataViews,
  onTabChange,
  currentTab: CONNECTORS_TAB,
};
jest.mock('../../assistant_context');

jest.mock('../../connectorland/connector_settings_management', () => ({
  ConnectorsSettingsManagement: () => <span data-test-subj="connectors-tab" />,
}));

jest.mock('../conversations/conversation_settings_management', () => ({
  ConversationSettingsManagement: () => <span data-test-subj="conversations-tab" />,
}));

jest.mock('../quick_prompts/quick_prompt_settings_management', () => ({
  QuickPromptSettingsManagement: () => <span data-test-subj="quick_prompts-tab" />,
}));

jest.mock('../prompt_editor/system_prompt/system_prompt_settings_management', () => ({
  SystemPromptSettingsManagement: () => <span data-test-subj="system_prompts-tab" />,
}));

jest.mock('../../knowledge_base/knowledge_base_settings_management', () => ({
  KnowledgeBaseSettingsManagement: () => <span data-test-subj="knowledge_base-tab" />,
}));

jest.mock('../../data_anonymization/settings/anonymization_settings_management', () => ({
  AnonymizationSettingsManagement: () => <span data-test-subj="anonymization-tab" />,
}));

jest.mock('.', () => {
  return {
    EvaluationSettings: () => <span data-test-subj="evaluation-tab" />,
  };
});

jest.mock('./use_settings_updater/use_settings_updater', () => {
  const original = jest.requireActual('./use_settings_updater/use_settings_updater');
  return {
    ...original,
    useSettingsUpdater: jest.fn().mockImplementation(() => mockValues),
  };
});

jest.mock('../../connectorland/use_load_connectors', () => ({
  useLoadConnectors: jest.fn().mockReturnValue({ data: [] }),
}));

const queryClient = new QueryClient();

const wrapper = (props: { children: React.ReactNode }) => (
  <I18nProvider>
    <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
  </I18nProvider>
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
      const { getByTestId } = render(
        <AssistantSettingsManagement {...testProps} currentTab={tab} />,
        {
          wrapper,
        }
      );
      fireEvent.click(getByTestId(`settingsPageTab-${tab}`));
      expect(onTabChange).toHaveBeenCalledWith(tab);
    });
    it('renders with the correct tab open', () => {
      const { getByTestId } = render(
        <AssistantSettingsManagement {...testProps} currentTab={tab} />,
        {
          wrapper,
        }
      );
      expect(getByTestId(`tab-${tab}`)).toBeInTheDocument();
    });
  });
});
