/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { SystemPromptSettings } from './system_prompt_settings';
import { TestProviders } from '../../../../mock/test_providers/test_providers';
import { alertConvo, welcomeConvo } from '../../../../mock/conversation';
import { mockSystemPrompts } from '../../../../mock/system_prompt';
import { TEST_IDS } from '../../../constants';

const onSelectedSystemPromptChange = jest.fn();
const setUpdatedSystemPromptSettings = jest.fn().mockImplementation((fn) => {
  return fn(mockSystemPrompts);
});
const setConversationSettings = jest.fn().mockImplementation((fn) => {
  return fn({
    [welcomeConvo.title]: welcomeConvo,
    [alertConvo.title]: alertConvo,
  });
});

const testProps = {
  connectors: [],
  conversationSettings: {
    [welcomeConvo.title]: welcomeConvo,
  },
  onSelectedSystemPromptChange,
  selectedSystemPrompt: mockSystemPrompts[0],
  setUpdatedSystemPromptSettings,
  setConversationSettings,
  systemPromptSettings: mockSystemPrompts,
  conversationsSettingsBulkActions: {},
  setConversationsSettingsBulkActions: jest.fn(),
  promptsBulkActions: {},
  setPromptsBulkActions: jest.fn(),
};

jest.mock('./system_prompt_selector/system_prompt_selector', () => ({
  // @ts-ignore
  SystemPromptSelector: ({ onSystemPromptDeleted, onSystemPromptSelectionChange }) => (
    <>
      <button
        type="button"
        data-test-subj="delete-sp"
        onClick={() => onSystemPromptDeleted(mockSystemPrompts[1].name)}
      />
      <button
        type="button"
        data-test-subj="change-sp"
        onClick={() => onSystemPromptSelectionChange(mockSystemPrompts[1])}
      />
      <button
        type="button"
        data-test-subj="change-sp-custom"
        onClick={() => onSystemPromptSelectionChange('sooper custom prompt')}
      />
    </>
  ),
}));
const mockConvos = [alertConvo, welcomeConvo];
jest.mock('./conversation_multi_selector/conversation_multi_selector', () => ({
  // @ts-ignore
  ConversationMultiSelector: ({ onConversationSelectionChange }) => (
    <>
      <button
        type="button"
        data-test-subj="change-multi"
        onClick={() => onConversationSelectionChange(mockConvos)}
      />
    </>
  ),
}));

describe('SystemPromptSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Selecting a system prompt updates the selected system prompts', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SystemPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-sp'));
    expect(setUpdatedSystemPromptSettings).toHaveReturnedWith(mockSystemPrompts);
    expect(onSelectedSystemPromptChange).toHaveBeenCalledWith(mockSystemPrompts[1]);
  });
  it('Entering a custom system prompt creates a new system prompt', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SystemPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-sp-custom'));
    const customOption = {
      consumer: 'test',
      content: '',
      id: 'sooper custom prompt',
      name: 'sooper custom prompt',
      promptType: 'system',
    };
    expect(setUpdatedSystemPromptSettings).toHaveReturnedWith([...mockSystemPrompts, customOption]);
    expect(onSelectedSystemPromptChange).toHaveBeenCalledWith(customOption);
  });
  it('Updating the current prompt input updates the prompt', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SystemPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.change(getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.PROMPT_TEXT), {
      target: { value: 'what does this do' },
    });
    const mutatableQuickPrompts = [...mockSystemPrompts];
    const previousFirstElementOfTheArray = mutatableQuickPrompts.shift();

    expect(setUpdatedSystemPromptSettings).toHaveReturnedWith([
      { ...previousFirstElementOfTheArray, content: 'what does this do' },
      ...mutatableQuickPrompts,
    ]);
  });
  it('Updating prompt contexts updates the categories of the prompt', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SystemPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-multi'));

    expect(setConversationSettings).toHaveReturnedWith({
      [welcomeConvo.id]: {
        ...welcomeConvo,
        apiConfig: {
          ...welcomeConvo.apiConfig,
          defaultSystemPromptId: 'mock-system-prompt-1',
        },
      },
      [alertConvo.id]: {
        ...alertConvo,
        apiConfig: {
          ...alertConvo.apiConfig,
          defaultSystemPromptId: 'mock-system-prompt-1',
        },
      },
    });
  });
  it('Toggle default conversation checkbox works', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SystemPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.TOGGLE_ALL_DEFAULT_CONVERSATIONS));
    const mutatableQuickPrompts = [...mockSystemPrompts];
    const previousFirstElementOfTheArray = mutatableQuickPrompts.shift();

    expect(setUpdatedSystemPromptSettings).toHaveReturnedWith([
      { ...previousFirstElementOfTheArray, isNewConversationDefault: true },
      ...mutatableQuickPrompts.map((p) => ({ ...p, isNewConversationDefault: false })),
    ]);
  });
});
