/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertConvo, welcomeConvo } from '../../mock/conversation';
import { Prompt } from '../../..';
import { mockSystemPrompt } from '../../mock/system_prompt';
import { fireEvent, render } from '@testing-library/react';
import {
  ANONYMIZATION_TAB,
  AssistantSettings,
  EVALUATION_TAB,
  KNOWLEDGE_BASE_TAB,
  QUICK_PROMPTS_TAB,
  SYSTEM_PROMPTS_TAB,
} from './assistant_settings';
import React from 'react';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { MOCK_QUICK_PROMPTS } from '../../mock/quick_prompt';

const mockConversations = {
  [alertConvo.id]: alertConvo,
  [welcomeConvo.id]: welcomeConvo,
};

const mockSystemPrompts: Prompt[] = [mockSystemPrompt];
const mockQuickPrompts = MOCK_QUICK_PROMPTS;

const initialDefaultAllow = ['allow1'];
const initialDefaultAllowReplacement = ['replacement1'];

const setAllQuickPromptsMock = jest.fn();
const setAllSystemPromptsMock = jest.fn();
const setConversationsMock = jest.fn();
const setDefaultAllowMock = jest.fn();
const setDefaultAllowReplacementMock = jest.fn();
const setKnowledgeBaseMock = jest.fn();

const mockValues = {
  conversationSettings: mockConversations,
  systemPromptSettings: mockSystemPrompts,
  quickPromptSettings: mockQuickPrompts,
  defaultAllow: initialDefaultAllow,
  defaultAllowReplacement: initialDefaultAllowReplacement,
  knowledgeBase: {
    assistantLangChain: true,
  },
  saveSettings: jest.fn(),
  resetSettings: jest.fn(),
  setUpdatedAllQuickPrompts: setAllQuickPromptsMock,
  setUpdatedConversations: setConversationsMock,
  setUpdatedAllSystemPrompts: setAllSystemPromptsMock,
  setUpdatedDefaultAllow: setDefaultAllowMock,
  setUpdatedDefaultAllowReplacement: setDefaultAllowReplacementMock,
  setUpdatedKnowledgeBase: setKnowledgeBaseMock,
};

const setSelectedSettingsTab = jest.fn();
const setIsSettingsModalVisible = jest.fn();
const mockContext = {
  basePromptContexts: MOCK_QUICK_PROMPTS,
  setSelectedSettingsTab,
  http: {},
  modelEvaluatorEnabled: true,
  selectedSettingsTab: 'CONVERSATIONS_TAB',
};
const onClose = jest.fn();
const onSave = jest.fn();
const setSelectedConversationId = jest.fn();

const testProps = {
  defaultConnectorId: '123',
  defaultProvider: OpenAiProviderType.OpenAi,
  selectedConversation: welcomeConvo,
  onClose,
  onSave,
  setSelectedConversationId,
};

jest.mock('../../assistant_context', () => {
  const original = jest.requireActual('../../assistant_context');
  return {
    ...original,
    useAssistantContext: jest.fn().mockImplementation(() => mockContext),
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
  });

  it.each([
    EVALUATION_TAB,
    KNOWLEDGE_BASE_TAB,
    ANONYMIZATION_TAB,
    SYSTEM_PROMPTS_TAB,
    QUICK_PROMPTS_TAB,
  ])('Opens %s tab on button click', (tab) => {
    const { getByTestId } = render(<AssistantSettings {...testProps} />);
    fireEvent.click(getByTestId(`${tab}-button`));
    expect(setSelectedSettingsTab).toHaveBeenCalledWith(tab);
  });
});
