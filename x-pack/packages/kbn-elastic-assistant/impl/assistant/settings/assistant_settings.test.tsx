/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertConvo, customConvo, welcomeConvo } from '../../mock/conversation';
import { useAssistantContext } from '../../assistant_context';
import { fireEvent, render, act } from '@testing-library/react';
import {
  AssistantSettings,
  ANONYMIZATION_TAB,
  CONVERSATIONS_TAB,
  EVALUATION_TAB,
  KNOWLEDGE_BASE_TAB,
  QUICK_PROMPTS_TAB,
  SYSTEM_PROMPTS_TAB,
} from './assistant_settings';
import React from 'react';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { MOCK_QUICK_PROMPTS } from '../../mock/quick_prompt';

const mockConversations = {
  [alertConvo.title]: alertConvo,
  [welcomeConvo.title]: welcomeConvo,
};
const saveSettings = jest.fn();

const mockValues = {
  conversationSettings: mockConversations,
  saveSettings,
};

const setSelectedSettingsTab = jest.fn();
const mockContext = {
  basePromptContexts: MOCK_QUICK_PROMPTS,
  setSelectedSettingsTab,
  http: {},
  modelEvaluatorEnabled: true,
  selectedSettingsTab: 'CONVERSATIONS_TAB',
};
const onClose = jest.fn();
const onSave = jest.fn().mockResolvedValue(() => {});
const onConversationSelected = jest.fn();

const testProps = {
  defaultConnectorId: '123',
  defaultProvider: OpenAiProviderType.OpenAi,
  selectedConversation: welcomeConvo,
  onClose,
  onSave,
  onConversationSelected,
  conversations: {},
};
jest.mock('../../assistant_context');

jest.mock('.', () => {
  return {
    AnonymizationSettings: () => <span data-test-subj="ANONYMIZATION_TAB-tab" />,
    ConversationSettings: () => <span data-test-subj={`CONVERSATION_TAB-tab`} />,
    EvaluationSettings: () => <span data-test-subj="EVALUATION_TAB-tab" />,
    KnowledgeBaseSettings: () => <span data-test-subj="KNOWLEDGE_BASE_TAB-tab" />,
    QuickPromptSettings: () => <span data-test-subj="QUICK_PROMPTS_TAB-tab" />,
    SystemPromptSettings: () => <span data-test-subj="SYSTEM_PROMPTS_TAB-tab" />,
  };
});

jest.mock('./use_settings_updater/use_settings_updater', () => {
  const original = jest.requireActual('./use_settings_updater/use_settings_updater');
  return {
    ...original,
    useSettingsUpdater: jest.fn().mockImplementation(() => mockValues),
  };
});

describe('AssistantSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAssistantContext as jest.Mock).mockImplementation(() => mockContext);
  });

  it('saves changes', async () => {
    const { getByTestId } = render(<AssistantSettings {...testProps} />);

    await act(async () => {
      fireEvent.click(getByTestId('save-button'));
    });
    expect(onSave).toHaveBeenCalled();
    expect(saveSettings).toHaveBeenCalled();
  });

  it('saves changes and updates selected conversation when selected conversation has been deleted', async () => {
    const { getByTestId } = render(
      <AssistantSettings {...testProps} selectedConversation={customConvo} />
    );
    await act(async () => {
      fireEvent.click(getByTestId('save-button'));
    });
    expect(onSave).toHaveBeenCalled();
    expect(onConversationSelected).toHaveBeenCalled();
    expect(saveSettings).toHaveBeenCalled();
  });

  it('on close is called when settings modal closes', () => {
    const { getByTestId } = render(<AssistantSettings {...testProps} />);
    fireEvent.click(getByTestId('cancel-button'));
    expect(onClose).toHaveBeenCalled();
  });

  describe.each([
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
        selectedSettingsTab: tab === CONVERSATIONS_TAB ? ANONYMIZATION_TAB : CONVERSATIONS_TAB,
      }));
      const { getByTestId } = render(<AssistantSettings {...testProps} />);
      fireEvent.click(getByTestId(`${tab}-button`));
      expect(setSelectedSettingsTab).toHaveBeenCalledWith(tab);
    });
    it('renders with the correct tab open', () => {
      (useAssistantContext as jest.Mock).mockImplementation(() => ({
        ...mockContext,
        selectedSettingsTab: tab,
      }));
      const { getByTestId } = render(<AssistantSettings {...testProps} />);
      expect(getByTestId(`${tab}-tab`)).toBeInTheDocument();
    });
  });
});
