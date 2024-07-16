/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook } from '@testing-library/react-hooks';

import { DEFAULT_LATEST_ALERTS } from '../../../assistant_context/constants';
import { alertConvo, welcomeConvo } from '../../../mock/conversation';
import { useSettingsUpdater } from './use_settings_updater';
import { defaultQuickPrompt, mockSystemPrompt } from '../../../mock/system_prompt';
import { HttpSetup } from '@kbn/core/public';
import { PromptResponse } from '@kbn/elastic-assistant-common';

const mockConversations = {
  [alertConvo.title]: alertConvo,
  [welcomeConvo.title]: welcomeConvo,
};
const conversationsLoaded = true;

const mockHttp = {
  fetch: jest.fn(),
} as unknown as HttpSetup;

const mockSystemPrompts: PromptResponse[] = [mockSystemPrompt];
const mockQuickPrompts: PromptResponse[] = [defaultQuickPrompt];

const anonymizationFields = {
  total: 2,
  page: 1,
  perPage: 1000,
  data: [
    { id: 'allow1', field: 'allow1', allowed: true, anonymized: false },
    { id: 'replacement1', field: 'replacement1', allowed: false, anonymized: true },
  ],
};

const setAssistantStreamingEnabled = jest.fn();
const setKnowledgeBaseMock = jest.fn();
const reportAssistantSettingToggled = jest.fn();
const setUpdatedAnonymizationData = jest.fn();
const mockValues = {
  assistantStreamingEnabled: true,
  setAssistantStreamingEnabled,
  assistantTelemetry: { reportAssistantSettingToggled },
  allSystemPrompts: mockSystemPrompts,
  allQuickPrompts: mockQuickPrompts,
  knowledgeBase: {
    isEnabledRAGAlerts: true,
    isEnabledKnowledgeBase: true,
    latestAlerts: DEFAULT_LATEST_ALERTS,
  },
  baseConversations: {},
  setKnowledgeBase: setKnowledgeBaseMock,
  http: mockHttp,
  anonymizationFieldsBulkActions: {},
};

const updatedValues = {
  conversations: { ...mockConversations },
  allSystemPrompts: [mockSystemPrompt],
  allQuickPrompts: [
    {
      consumer: 'securitySolutionUI',
      content:
        'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:',
      id: 'default-system-prompt',
      name: 'Default system prompt',
      promptType: 'quick',
      color: 'red',
    },
  ],
  updatedAnonymizationData: {
    total: 2,
    page: 1,
    perPage: 1000,
    data: [
      { id: 'allow2', field: 'allow2', allowed: true, anonymized: false },
      { id: 'replacement2', field: 'replacement2', allowed: false, anonymized: true },
    ],
  },
  knowledgeBase: {
    isEnabledRAGAlerts: false,
    isEnabledKnowledgeBase: false,
    latestAlerts: DEFAULT_LATEST_ALERTS,
  },
  assistantStreamingEnabled: false,
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
      const { result, waitForNextUpdate } = renderHook(() =>
        useSettingsUpdater(
          mockConversations,
          {
            data: [...mockSystemPrompts, ...mockQuickPrompts],
            page: 1,
            perPage: 100,
            total: 10,
          },
          conversationsLoaded,
          anonymizationFields
        )
      );
      await waitForNextUpdate();
      const {
        setConversationSettings,
        setConversationsSettingsBulkActions,
        setUpdatedKnowledgeBaseSettings,
        setUpdatedAssistantStreamingEnabled,
        resetSettings,
        setPromptsBulkActions,
      } = result.current;

      setConversationSettings(updatedValues.conversations);
      setConversationsSettingsBulkActions({});
      setPromptsBulkActions({});
      setUpdatedAnonymizationData(updatedValues.updatedAnonymizationData);
      setUpdatedKnowledgeBaseSettings(updatedValues.knowledgeBase);
      setUpdatedAssistantStreamingEnabled(updatedValues.assistantStreamingEnabled);

      expect(result.current.conversationSettings).toEqual(updatedValues.conversations);
      expect(result.current.quickPromptSettings).toEqual(updatedValues.allQuickPrompts);
      expect(result.current.systemPromptSettings).toEqual(updatedValues.allSystemPrompts);
      expect(result.current.updatedAnonymizationData).toEqual(anonymizationFields);
      expect(result.current.knowledgeBase).toEqual(updatedValues.knowledgeBase);
      expect(result.current.assistantStreamingEnabled).toEqual(
        updatedValues.assistantStreamingEnabled
      );

      resetSettings();

      expect(result.current.conversationSettings).toEqual(mockConversations);
      expect(result.current.quickPromptSettings).toEqual(mockValues.allQuickPrompts);
      expect(result.current.systemPromptSettings).toEqual(mockValues.allSystemPrompts);
      expect(result.current.anonymizationFieldsBulkActions).toEqual(
        mockValues.anonymizationFieldsBulkActions
      );
      expect(result.current.knowledgeBase).toEqual(mockValues.knowledgeBase);
      expect(result.current.assistantStreamingEnabled).toEqual(
        mockValues.assistantStreamingEnabled
      );
    });
  });

  it('should update all state variables to their updated values when saveSettings is called', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useSettingsUpdater(
          mockConversations,
          {
            data: mockSystemPrompts,
            page: 1,
            perPage: 100,
            total: 10,
          },
          conversationsLoaded,
          anonymizationFields
        )
      );
      await waitForNextUpdate();
      const {
        setConversationSettings,
        setConversationsSettingsBulkActions,
        setAnonymizationFieldsBulkActions,
        setUpdatedKnowledgeBaseSettings,
        setPromptsBulkActions,
      } = result.current;

      setConversationSettings(updatedValues.conversations);
      setConversationsSettingsBulkActions({ delete: { ids: ['1'] } });
      setAnonymizationFieldsBulkActions({ delete: { ids: ['1'] } });
      setPromptsBulkActions({});
      setUpdatedAnonymizationData(updatedValues.updatedAnonymizationData);
      setUpdatedKnowledgeBaseSettings(updatedValues.knowledgeBase);

      await result.current.saveSettings();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        '/internal/elastic_assistant/current_user/conversations/_bulk_action',
        {
          method: 'POST',
          version: '1',
          body: '{"delete":{"ids":["1"]}}',
        }
      );
      expect(setUpdatedAnonymizationData).toHaveBeenCalledWith(
        updatedValues.updatedAnonymizationData
      );
      expect(setKnowledgeBaseMock).toHaveBeenCalledWith(updatedValues.knowledgeBase);
    });
  });
  it('should track which toggles have been updated when saveSettings is called', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useSettingsUpdater(
          mockConversations,
          {
            data: mockSystemPrompts,
            page: 1,
            perPage: 100,
            total: 10,
          },
          conversationsLoaded,
          anonymizationFields
        )
      );
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
      const { result, waitForNextUpdate } = renderHook(() =>
        useSettingsUpdater(
          mockConversations,
          {
            data: mockSystemPrompts,
            page: 1,
            perPage: 100,
            total: 10,
          },
          conversationsLoaded,
          anonymizationFields
        )
      );
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
      const { result, waitForNextUpdate } = renderHook(() =>
        useSettingsUpdater(
          mockConversations,
          {
            data: mockSystemPrompts,
            page: 1,
            perPage: 100,
            total: 10,
          },
          conversationsLoaded,
          anonymizationFields
        )
      );
      await waitForNextUpdate();
      const { setUpdatedKnowledgeBaseSettings } = result.current;

      setUpdatedKnowledgeBaseSettings(mockValues.knowledgeBase);
      await result.current.saveSettings();
      expect(reportAssistantSettingToggled).not.toHaveBeenCalledWith();
    });
  });
});
