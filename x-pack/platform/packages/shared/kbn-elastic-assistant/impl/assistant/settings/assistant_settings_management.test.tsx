/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { welcomeConvo } from '../../mock/conversation';
import { useAssistantContext } from '../../assistant_context';
import { fireEvent, render } from '@testing-library/react';

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { MOCK_QUICK_PROMPTS } from '../../mock/quick_prompt';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
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
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

const mockSetSelectedSettingsTab = jest.fn();

const mockContext = {
  basePromptContexts: MOCK_QUICK_PROMPTS,
  http: {
    get: jest.fn(),
  },
  assistantFeatures: { assistantModelEvaluation: true },
  assistantAvailability: {
    isAssistantEnabled: true,
    isAssistantManagementEnabled: true,
    hasConnectorsAllPrivilege: true,
  },
  settings: {
    client: {
      get: jest.fn((key) => {
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
          return 'c5f91dc0-2197-11ee-aded-897192c5d6f5';
        }
        if (key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) {
          return false;
        }
        return undefined;
      }),
    },
  },
  selectedSettingsTab: null,
  setSelectedSettingsTab: mockSetSelectedSettingsTab,
  navigateToApp: jest.fn(),
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

  describe('useEffect behavior', () => {
    it('calls onTabChange and clears contextSettingsTab when contextSettingsTab is set', () => {
      const contextWithTab = {
        ...mockContext,
        selectedSettingsTab: SYSTEM_PROMPTS_TAB,
      };
      (useAssistantContext as jest.Mock).mockImplementation(() => contextWithTab);

      render(<AssistantSettingsManagement {...testProps} />, { wrapper });

      expect(onTabChange).toHaveBeenCalledWith(SYSTEM_PROMPTS_TAB);
      expect(mockSetSelectedSettingsTab).toHaveBeenCalledWith(null);
    });

    it('does not call onTabChange when contextSettingsTab is null', () => {
      const contextWithoutTab = {
        ...mockContext,
        selectedSettingsTab: null,
      };
      (useAssistantContext as jest.Mock).mockImplementation(() => contextWithoutTab);

      render(<AssistantSettingsManagement {...testProps} />, { wrapper });

      expect(onTabChange).not.toHaveBeenCalled();
      expect(mockSetSelectedSettingsTab).not.toHaveBeenCalled();
    });
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
