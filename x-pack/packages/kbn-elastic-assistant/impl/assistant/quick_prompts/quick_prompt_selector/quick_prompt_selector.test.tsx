/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { QuickPromptSelector } from './quick_prompt_selector';
import { MOCK_QUICK_PROMPTS } from '../../../mock/quick_prompt';

const onQuickPromptSelectionChange = jest.fn();
const onQuickPromptDeleted = jest.fn();
const testProps = {
  quickPrompts: MOCK_QUICK_PROMPTS,
  selectedQuickPrompt: MOCK_QUICK_PROMPTS[0],
  onQuickPromptDeleted,
  onQuickPromptSelectionChange,
};

describe('QuickPromptSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Selects an existing quick prompt', () => {
    const { getByTestId } = render(<QuickPromptSelector {...testProps} />);
    expect(getByTestId('euiComboBoxPill')).toHaveTextContent(MOCK_QUICK_PROMPTS[0].name);
    fireEvent.click(getByTestId('comboBoxToggleListButton'));
    fireEvent.click(getByTestId(MOCK_QUICK_PROMPTS[1].name));
    expect(onQuickPromptSelectionChange).toHaveBeenCalledWith(MOCK_QUICK_PROMPTS[1]);
  });
  it('Only custom option can be deleted', () => {
    const { getByTestId } = render(<QuickPromptSelector {...testProps} />);
    fireEvent.click(getByTestId('comboBoxToggleListButton'));
    // there is only one delete quick prompt because there is only one custom option
    fireEvent.click(getByTestId('delete-quick-prompt'));
    expect(onQuickPromptDeleted).toHaveBeenCalledWith('A_CUSTOM_OPTION');
  });
  it('Selects existing quick prompt from the search  input', () => {
    const { getByTestId } = render(<QuickPromptSelector {...testProps} />);
    const customOption = 'A_CUSTOM_OPTION';
    fireEvent.change(getByTestId('comboBoxSearchInput'), { target: { value: customOption } });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(onQuickPromptSelectionChange).toHaveBeenCalledWith({
      categories: [],
      color: '#D36086',
      content: 'quickly prompt please',
      id: 'A_CUSTOM_OPTION',
      name: 'A_CUSTOM_OPTION',
      promptType: 'quick',
    });
  });
  it('Reset settings every time before selecting an system prompt from the input if resetSettings is provided', () => {
    const mockResetSettings = jest.fn();
    const { getByTestId } = render(
      <QuickPromptSelector {...testProps} resetSettings={mockResetSettings} />
    );
    // changing the selection
    fireEvent.change(getByTestId('comboBoxSearchInput'), {
      target: { value: MOCK_QUICK_PROMPTS[1].name },
    });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(mockResetSettings).toHaveBeenCalled();
  });
  it('Creates a new quick prompt', () => {
    const { getByTestId } = render(<QuickPromptSelector {...testProps} />);
    const customOption = 'Cool new prompt';
    fireEvent.change(getByTestId('comboBoxSearchInput'), { target: { value: customOption } });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(onQuickPromptSelectionChange).toHaveBeenCalledWith(customOption);
  });
});
