/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook } from '@testing-library/react-hooks';
import { alertConvo, customConvo, welcomeConvo } from '../../../mock/conversation';
import { useSettingsUpdater } from './use_settings_updater';
import { Prompt } from '../../../..';
import {
  defaultSystemPrompt,
  mockSuperheroSystemPrompt,
  mockSystemPrompt,
} from '../../../mock/system_prompt';

const mockConversations = {
  [alertConvo.id]: alertConvo,
  [welcomeConvo.id]: welcomeConvo,
};

const mockSystemPrompts: Prompt[] = [mockSystemPrompt];
const mockQuickPrompts: Prompt[] = [defaultSystemPrompt];

const initialDefaultAllow = ['allow1'];
const initialDefaultAllowReplacement = ['replacement1'];

const setAllQuickPromptsMock = jest.fn();
const setAllSystemPromptsMock = jest.fn();
const setConversationsMock = jest.fn();
const setDefaultAllowMock = jest.fn();
const setDefaultAllowReplacementMock = jest.fn();

const mockValues = {
  conversations: mockConversations,
  allSystemPrompts: mockSystemPrompts,
  allQuickPrompts: mockQuickPrompts,
  defaultAllow: initialDefaultAllow,
  defaultAllowReplacement: initialDefaultAllowReplacement,
  setAllQuickPrompts: setAllQuickPromptsMock,
  setConversations: setConversationsMock,
  setAllSystemPrompts: setAllSystemPromptsMock,
  setDefaultAllow: setDefaultAllowMock,
  setDefaultAllowReplacement: setDefaultAllowReplacementMock,
};

const updatedValues = {
  conversations: { [customConvo.id]: customConvo },
  allSystemPrompts: [mockSuperheroSystemPrompt],
  allQuickPrompts: [{ title: 'Prompt 2', prompt: 'Prompt 2', color: 'red' }],
  defaultAllow: ['allow2'],
  defaultAllowReplacement: ['replacement2'],
};

jest.mock('../../../assistant_context', () => {
  const original = jest.requireActual('../../../assistant_context');
  return {
    ...original,
    useAssistantContext: jest.fn().mockImplementation(() => mockValues),
  };
});

describe('useSettingsUpdater', () => {
  it('should return an object with all the necessary state variables and functionse', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSettingsUpdater());
      await waitForNextUpdate();
      expect(result.current).toHaveProperty('conversationSettings');
      expect(result.current).toHaveProperty('defaultAllow');
      expect(result.current).toHaveProperty('defaultAllowReplacement');
      expect(result.current).toHaveProperty('quickPromptSettings');
      expect(result.current).toHaveProperty('resetSettings');
      expect(result.current).toHaveProperty('systemPromptSettings');
      expect(result.current).toHaveProperty('saveSettings');
      expect(result.current).toHaveProperty('setUpdatedDefaultAllow');
      expect(result.current).toHaveProperty('setUpdatedDefaultAllowReplacement');
      expect(result.current).toHaveProperty('setUpdatedConversationSettings');
      expect(result.current).toHaveProperty('setUpdatedQuickPromptSettings');
      expect(result.current).toHaveProperty('setUpdatedSystemPromptSettings');
    });
  });

  it('should set all state variables to their initial values when resetSettings is called', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSettingsUpdater());
      await waitForNextUpdate();
      const {
        setUpdatedConversationSettings,
        setUpdatedQuickPromptSettings,
        setUpdatedSystemPromptSettings,
        setUpdatedDefaultAllow,
        setUpdatedDefaultAllowReplacement,
        resetSettings,
      } = result.current;

      setUpdatedConversationSettings(updatedValues.conversations);
      setUpdatedQuickPromptSettings(updatedValues.allQuickPrompts);
      setUpdatedSystemPromptSettings(updatedValues.allSystemPrompts);
      setUpdatedDefaultAllow(updatedValues.defaultAllow);
      setUpdatedDefaultAllowReplacement(updatedValues.defaultAllowReplacement);

      expect(result.current.conversationSettings).toEqual(updatedValues.conversations);
      expect(result.current.quickPromptSettings).toEqual(updatedValues.allQuickPrompts);
      expect(result.current.systemPromptSettings).toEqual(updatedValues.allSystemPrompts);
      expect(result.current.defaultAllow).toEqual(updatedValues.defaultAllow);
      expect(result.current.defaultAllowReplacement).toEqual(updatedValues.defaultAllowReplacement);

      resetSettings();

      expect(result.current.conversationSettings).toEqual(mockValues.conversations);
      expect(result.current.quickPromptSettings).toEqual(mockValues.allQuickPrompts);
      expect(result.current.systemPromptSettings).toEqual(mockValues.allSystemPrompts);
      expect(result.current.defaultAllow).toEqual(mockValues.defaultAllow);
      expect(result.current.defaultAllowReplacement).toEqual(mockValues.defaultAllowReplacement);
    });
  });

  it('should update all state variables to their updated values when saveSettings is called', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSettingsUpdater());
      await waitForNextUpdate();
      const {
        setUpdatedConversationSettings,
        setUpdatedQuickPromptSettings,
        setUpdatedSystemPromptSettings,
        setUpdatedDefaultAllow,
        setUpdatedDefaultAllowReplacement,
      } = result.current;

      setUpdatedConversationSettings(updatedValues.conversations);
      setUpdatedQuickPromptSettings(updatedValues.allQuickPrompts);
      setUpdatedSystemPromptSettings(updatedValues.allSystemPrompts);
      setUpdatedDefaultAllow(updatedValues.defaultAllow);
      setUpdatedDefaultAllowReplacement(updatedValues.defaultAllowReplacement);

      expect(result.current.conversationSettings).toEqual(updatedValues.conversations);
      expect(result.current.quickPromptSettings).toEqual(updatedValues.allQuickPrompts);
      expect(result.current.systemPromptSettings).toEqual(updatedValues.allSystemPrompts);
      expect(result.current.defaultAllow).toEqual(updatedValues.defaultAllow);
      expect(result.current.defaultAllowReplacement).toEqual(updatedValues.defaultAllowReplacement);

      result.current.saveSettings();

      expect(setAllQuickPromptsMock).toHaveBeenCalledWith(updatedValues.allQuickPrompts);
      expect(setAllSystemPromptsMock).toHaveBeenCalledWith(updatedValues.allSystemPrompts);
      expect(setConversationsMock).toHaveBeenCalledWith(updatedValues.conversations);
      expect(setDefaultAllowMock).toHaveBeenCalledWith(updatedValues.defaultAllow);
      expect(setDefaultAllowReplacementMock).toHaveBeenCalledWith(
        updatedValues.defaultAllowReplacement
      );
    });
  });
});
