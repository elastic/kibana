/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { QuickPromptSettings } from './quick_prompt_settings';
import { TestProviders } from '../../../mock/test_providers/test_providers';
import { MOCK_QUICK_PROMPTS } from '../../../mock/quick_prompt';
import { mockPromptContexts } from '../../../mock/prompt_context';

const onSelectedQuickPromptChange = jest.fn();
const setPromptsBulkActions = jest.fn();
const setUpdatedQuickPromptSettings = jest.fn().mockImplementation((fn) => {
  return fn(MOCK_QUICK_PROMPTS);
});

const testProps = {
  onSelectedQuickPromptChange,
  quickPromptSettings: MOCK_QUICK_PROMPTS,
  selectedQuickPrompt: MOCK_QUICK_PROMPTS[0],
  setUpdatedQuickPromptSettings,
  promptsBulkActions: {},
  setPromptsBulkActions,
};
const mockContext = {
  basePromptContexts: MOCK_QUICK_PROMPTS,
};

jest.mock('../../../assistant_context', () => ({
  ...jest.requireActual('../../../assistant_context'),
  useAssistantContext: () => mockContext,
}));

jest.mock('../quick_prompt_selector/quick_prompt_selector', () => ({
  // @ts-ignore
  QuickPromptSelector: ({ onQuickPromptDeleted, onQuickPromptSelectionChange }) => (
    <>
      <button
        type="button"
        data-test-subj="delete-qp"
        onClick={() => onQuickPromptDeleted('A_CUSTOM_OPTION')}
      />
      <button
        type="button"
        data-test-subj="change-qp"
        onClick={() => onQuickPromptSelectionChange(MOCK_QUICK_PROMPTS[3])}
      />
      <button
        type="button"
        data-test-subj="change-qp-custom"
        onClick={() => onQuickPromptSelectionChange('sooper custom prompt')}
      />
    </>
  ),
}));
jest.mock('../prompt_context_selector/prompt_context_selector', () => ({
  // @ts-ignore
  PromptContextSelector: ({ onPromptContextSelectionChange }) => (
    <>
      <button
        type="button"
        data-test-subj="change-pc"
        onClick={() => onPromptContextSelectionChange(mockPromptContexts)}
      />
    </>
  ),
}));

describe('QuickPromptSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Selecting a quick prompt updates the selected quick prompts', () => {
    const { getByTestId } = render(
      <TestProviders>
        <QuickPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-qp'));
    expect(setUpdatedQuickPromptSettings).toHaveReturnedWith(MOCK_QUICK_PROMPTS);
    expect(onSelectedQuickPromptChange).toHaveBeenCalledWith(MOCK_QUICK_PROMPTS[3]);
  });
  it('Entering a custom quick prompt creates a new quick prompt', () => {
    const { getByTestId } = render(
      <TestProviders>
        <QuickPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-qp-custom'));
    const customOption = {
      categories: [],
      color: '#D36086',
      consumer: undefined,
      content: '',
      id: 'sooper custom prompt',
      name: 'sooper custom prompt',
      promptType: 'quick',
    };
    expect(setUpdatedQuickPromptSettings).toHaveReturnedWith([...MOCK_QUICK_PROMPTS, customOption]);
    expect(onSelectedQuickPromptChange).toHaveBeenCalledWith(customOption);
  });
  it('Quick prompt badge color can be updated', () => {
    const { getByTestId } = render(
      <TestProviders>
        <QuickPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.change(getByTestId('euiColorPickerAnchor'), { target: { value: '#000' } });
    fireEvent.keyDown(getByTestId('euiColorPickerAnchor'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    const mutatableQuickPrompts = [...MOCK_QUICK_PROMPTS];
    const previousFirstElementOfTheArray = mutatableQuickPrompts.shift();

    expect(setUpdatedQuickPromptSettings).toHaveReturnedWith([
      { ...previousFirstElementOfTheArray, color: '#000' },
      ...mutatableQuickPrompts,
    ]);
  });
  it('Updating the current prompt input updates the prompt', () => {
    const { getByTestId } = render(
      <TestProviders>
        <QuickPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.change(getByTestId('quick-prompt-prompt'), {
      target: { value: 'what does this do' },
    });
    const mutatableQuickPrompts = [...MOCK_QUICK_PROMPTS];
    const previousFirstElementOfTheArray = mutatableQuickPrompts.shift();

    expect(setUpdatedQuickPromptSettings).toHaveReturnedWith([
      { ...previousFirstElementOfTheArray, content: 'what does this do' },
      ...mutatableQuickPrompts,
    ]);
  });
  it('Updating prompt contexts updates the categories of the prompt', () => {
    const { getByTestId } = render(
      <TestProviders>
        <QuickPromptSettings {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('change-pc'));
    const mutatableQuickPrompts = [...MOCK_QUICK_PROMPTS];
    const previousFirstElementOfTheArray = mutatableQuickPrompts.shift();

    expect(setUpdatedQuickPromptSettings).toHaveReturnedWith([
      { ...previousFirstElementOfTheArray, categories: ['alert', 'event'] },
      ...mutatableQuickPrompts,
    ]);
  });
});
