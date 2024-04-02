/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook } from '@testing-library/react-hooks';

import { DEFAULT_LATEST_ALERTS } from '../../../assistant_context/constants';
import { alertConvo, customConvo, welcomeConvo } from '../../../mock/conversation';
import { useSettingsUpdater } from './use_settings_updater';
import { Prompt } from '../../../..';
import {
  defaultSystemPrompt,
  mockSuperheroSystemPrompt,
  mockSystemPrompt,
} from '../../../mock/system_prompt';
import { HttpSetup } from '@kbn/core/public';

const mockConversations = {
  [alertConvo.title]: alertConvo,
  [welcomeConvo.title]: welcomeConvo,
};

const mockHttp = {
  fetch: jest.fn(),
} as unknown as HttpSetup;

const mockSystemPrompts: Prompt[] = [mockSystemPrompt];
const mockQuickPrompts: Prompt[] = [defaultSystemPrompt];

const initialDefaultAllow = ['allow1'];
const initialDefaultAllowReplacement = ['replacement1'];

const setAllQuickPromptsMock = jest.fn();
const setAllSystemPromptsMock = jest.fn();
const setDefaultAllowMock = jest.fn();
const setDefaultAllowReplacementMock = jest.fn();
const setKnowledgeBaseMock = jest.fn();
const reportAssistantSettingToggled = jest.fn();
const mockValues = {
  assistantTelemetry: { reportAssistantSettingToggled },
  allSystemPrompts: mockSystemPrompts,
  allQuickPrompts: mockQuickPrompts,
  defaultAllow: initialDefaultAllow,
  defaultAllowReplacement: initialDefaultAllowReplacement,
  knowledgeBase: {
    isEnabledRAGAlerts: true,
    isEnabledKnowledgeBase: true,
    latestAlerts: DEFAULT_LATEST_ALERTS,
  },
  baseConversations: {},
  setAllQuickPrompts: setAllQuickPromptsMock,
  setAllSystemPrompts: setAllSystemPromptsMock,
  setDefaultAllow: setDefaultAllowMock,
  setDefaultAllowReplacement: setDefaultAllowReplacementMock,
  setKnowledgeBase: setKnowledgeBaseMock,
  http: mockHttp,
};

const updatedValues = {
  conversations: { [customConvo.title]: customConvo },
  allSystemPrompts: [mockSuperheroSystemPrompt],
  allQuickPrompts: [{ title: 'Prompt 2', prompt: 'Prompt 2', color: 'red' }],
  defaultAllow: ['allow2'],
  defaultAllowReplacement: ['replacement2'],
  knowledgeBase: {
    isEnabledRAGAlerts: false,
    isEnabledKnowledgeBase: false,
    latestAlerts: DEFAULT_LATEST_ALERTS,
  },
};

jest.mock('../../../assistant_context', () => {
  const original = jest.requireActual('../../../assistant_context');
  return {
    ...original,
    useAssistantContext: jest.fn().mockImplementation(() => mockValues),
  };
});

describe('useSettingsUpdater', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should set all state variables to their initial values when resetSettings is called', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSettingsUpdater(mockConversations));
      await waitForNextUpdate();
      const {
        setConversationSettings,
        setConversationsSettingsBulkActions,
        setUpdatedQuickPromptSettings,
        setUpdatedSystemPromptSettings,
        setUpdatedDefaultAllow,
        setUpdatedDefaultAllowReplacement,
        setUpdatedKnowledgeBaseSettings,
        resetSettings,
      } = result.current;

      setConversationSettings(updatedValues.conversations);
      setConversationsSettingsBulkActions({});
      setUpdatedQuickPromptSettings(updatedValues.allQuickPrompts);
      setUpdatedSystemPromptSettings(updatedValues.allSystemPrompts);
      setUpdatedDefaultAllow(updatedValues.defaultAllow);
      setUpdatedDefaultAllowReplacement(updatedValues.defaultAllowReplacement);
      setUpdatedKnowledgeBaseSettings(updatedValues.knowledgeBase);

      expect(result.current.conversationSettings).toEqual(updatedValues.conversations);
      expect(result.current.quickPromptSettings).toEqual(updatedValues.allQuickPrompts);
      expect(result.current.systemPromptSettings).toEqual(updatedValues.allSystemPrompts);
      expect(result.current.defaultAllow).toEqual(updatedValues.defaultAllow);
      expect(result.current.defaultAllowReplacement).toEqual(updatedValues.defaultAllowReplacement);
      expect(result.current.knowledgeBase).toEqual(updatedValues.knowledgeBase);

      resetSettings();

      expect(result.current.conversationSettings).toEqual(mockConversations);
      expect(result.current.quickPromptSettings).toEqual(mockValues.allQuickPrompts);
      expect(result.current.systemPromptSettings).toEqual(mockValues.allSystemPrompts);
      expect(result.current.defaultAllow).toEqual(mockValues.defaultAllow);
      expect(result.current.defaultAllowReplacement).toEqual(mockValues.defaultAllowReplacement);
      expect(result.current.knowledgeBase).toEqual(mockValues.knowledgeBase);
    });
  });

  it('should update all state variables to their updated values when saveSettings is called', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSettingsUpdater(mockConversations));
      await waitForNextUpdate();
      const {
        setConversationSettings,
        setConversationsSettingsBulkActions,
        setUpdatedQuickPromptSettings,
        setUpdatedSystemPromptSettings,
        setUpdatedDefaultAllow,
        setUpdatedDefaultAllowReplacement,
        setUpdatedKnowledgeBaseSettings,
      } = result.current;

      setConversationSettings(updatedValues.conversations);
      setConversationsSettingsBulkActions({ delete: { ids: ['1'] } });
      setUpdatedQuickPromptSettings(updatedValues.allQuickPrompts);
      setUpdatedSystemPromptSettings(updatedValues.allSystemPrompts);
      setUpdatedDefaultAllow(updatedValues.defaultAllow);
      setUpdatedDefaultAllowReplacement(updatedValues.defaultAllowReplacement);
      setUpdatedKnowledgeBaseSettings(updatedValues.knowledgeBase);

      await result.current.saveSettings();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/api/elastic_assistant/current_user/conversations/_bulk_action',
        {
          method: 'POST',
          version: '2023-10-31',
          body: '{"delete":{"ids":["1"]}}',
        }
      );
      expect(setAllQuickPromptsMock).toHaveBeenCalledWith(updatedValues.allQuickPrompts);
      expect(setAllSystemPromptsMock).toHaveBeenCalledWith(updatedValues.allSystemPrompts);
      expect(setDefaultAllowMock).toHaveBeenCalledWith(updatedValues.defaultAllow);
      expect(setDefaultAllowReplacementMock).toHaveBeenCalledWith(
        updatedValues.defaultAllowReplacement
      );
      expect(setKnowledgeBaseMock).toHaveBeenCalledWith(updatedValues.knowledgeBase);
    });
  });
  it('should track which toggles have been updated when saveSettings is called', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSettingsUpdater(mockConversations));
      await waitForNextUpdate();
      const { setUpdatedKnowledgeBaseSettings } = result.current;

      setUpdatedKnowledgeBaseSettings(updatedValues.knowledgeBase);

      await result.current.saveSettings();
      expect(reportAssistantSettingToggled).toHaveBeenCalledWith({
        isEnabledKnowledgeBase: false,
        isEnabledRAGAlerts: false,
      });
    });
  });
  it('should track only toggles that updated', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSettingsUpdater(mockConversations));
      await waitForNextUpdate();
      const { setUpdatedKnowledgeBaseSettings } = result.current;

      setUpdatedKnowledgeBaseSettings({
        ...updatedValues.knowledgeBase,
        isEnabledKnowledgeBase: true,
      });
      await result.current.saveSettings();
      expect(reportAssistantSettingToggled).toHaveBeenCalledWith({
        isEnabledRAGAlerts: false,
      });
    });
  });
  it('if no toggles update, do not track anything', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSettingsUpdater(mockConversations));
      await waitForNextUpdate();
      const { setUpdatedKnowledgeBaseSettings } = result.current;

      setUpdatedKnowledgeBaseSettings(mockValues.knowledgeBase);
      await result.current.saveSettings();
      expect(reportAssistantSettingToggled).not.toHaveBeenCalledWith();
    });
  });
});
