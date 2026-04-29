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
import { mockSystemPromptSettings } from '../../../../mock/system_prompt';
import { TEST_IDS } from '../../../constants';

const onSystemPromptSelect = jest.fn();
const onPromptContentChange = jest.fn();
const onConversationSelectionChange = jest.fn();
const onNewConversationDefaultChange = jest.fn();

const testProps = {
  conversations: {
    [welcomeConvo.title]: welcomeConvo,
  },
  onConversationSelectionChange,
  onNewConversationDefaultChange,
  onPromptContentChange,
  onSystemPromptDelete: jest.fn(),
  onSystemPromptSelect,
  resetSettings: jest.fn(),
  selectedSystemPrompt: mockSystemPromptSettings[0],
  systemPromptSettings: mockSystemPromptSettings,
  setPaginationObserver: jest.fn(),
};

jest.mock('./system_prompt_selector/system_prompt_selector', () => ({
  // @ts-ignore
  SystemPromptSelector: ({ onSystemPromptDeleted, onSystemPromptSelectionChange }) => (
    <>
      <button
        type="button"
        data-test-subj="delete-sp"
        onClick={() => onSystemPromptDeleted(mockSystemPromptSettings[1].name)}
      />
      <button
        type="button"
        data-test-subj="change-sp"
        onClick={() => onSystemPromptSelectionChange(mockSystemPromptSettings[1])}
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
  ConversationMultiSelector: ({ onConversationSelectionChange: onChange }) => (
    <>
      <button type="button" data-test-subj="change-multi" onClick={() => onChange(mockConvos)} />
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
    expect(onSystemPromptSelect).toHaveBeenCalledWith(mockSystemPromptSettings[1]);
  });
  it('Entering a custom system prompt creates a new system prompt', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SystemPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-sp-custom'));

    expect(onSystemPromptSelect).toHaveBeenCalledWith('sooper custom prompt');
  });
  it('Updating the current prompt input updates the prompt', async () => {
    const { getByTestId } = render(
      <TestProviders>
        <SystemPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.change(getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.PROMPT_TEXT), {
      target: { value: 'what does this do' },
    });
    expect(onPromptContentChange).toHaveBeenCalledWith('what does this do');
  });
  it('onConversationSelectionChange is called when conversations are selected from ConversationMultiSelector', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SystemPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-multi'));

    expect(onConversationSelectionChange).toHaveBeenCalledWith(mockConvos);
  });
  it('Toggle default conversation checkbox works', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SystemPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId(TEST_IDS.SYSTEM_PROMPT_MODAL.TOGGLE_ALL_DEFAULT_CONVERSATIONS));

    expect(onNewConversationDefaultChange).toHaveBeenCalledWith(true);
  });
});
