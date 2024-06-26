/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { SystemPromptSelector } from './system_prompt_selector';
import { mockSystemPrompts } from '../../../../../mock/system_prompt';

const onSystemPromptSelectionChange = jest.fn();
const onSystemPromptDeleted = jest.fn();
const testProps = {
  systemPrompts: mockSystemPrompts,
  onSystemPromptSelectionChange,
  onSystemPromptDeleted,
  selectedSystemPrompt: mockSystemPrompts[0],
};

describe('SystemPromptSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Selects an existing system prompt', () => {
    const { getByTestId } = render(<SystemPromptSelector {...testProps} />);
    expect(getByTestId('comboBoxSearchInput')).toHaveValue(mockSystemPrompts[0].name);
    fireEvent.click(getByTestId('comboBoxToggleListButton'));
    fireEvent.click(getByTestId(`systemPromptSelector-${mockSystemPrompts[1].id}`));
    expect(onSystemPromptSelectionChange).toHaveBeenCalledWith(mockSystemPrompts[1]);
  });
  it('Deletes a system prompt that is not selected', () => {
    const { getByTestId, getAllByTestId } = render(<SystemPromptSelector {...testProps} />);
    fireEvent.click(getByTestId('comboBoxToggleListButton'));
    // there is only one delete system prompt because there is only one custom option
    fireEvent.click(getAllByTestId('delete-prompt')[1]);
    expect(onSystemPromptDeleted).toHaveBeenCalledWith(mockSystemPrompts[1].name);
    expect(onSystemPromptSelectionChange).not.toHaveBeenCalled();
  });
  it('Deletes a system prompt that is selected', () => {
    const { getByTestId, getAllByTestId } = render(<SystemPromptSelector {...testProps} />);
    fireEvent.click(getByTestId('comboBoxToggleListButton'));
    // there is only one delete system prompt because there is only one custom option
    fireEvent.click(getAllByTestId('delete-prompt')[0]);
    expect(onSystemPromptDeleted).toHaveBeenCalledWith(mockSystemPrompts[0].name);
    expect(onSystemPromptSelectionChange).toHaveBeenCalledWith(undefined);
  });
  it('Selects existing system prompt from the search input', () => {
    const { getByTestId } = render(<SystemPromptSelector {...testProps} />);
    fireEvent.change(getByTestId('comboBoxSearchInput'), {
      target: { value: mockSystemPrompts[1].name },
    });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(onSystemPromptSelectionChange).toHaveBeenCalledWith(mockSystemPrompts[1]);
  });
  it('Reset settings every time before selecting an system prompt from the input if resetSettings is provided', () => {
    const mockResetSettings = jest.fn();
    const { getByTestId } = render(
      <SystemPromptSelector {...testProps} resetSettings={mockResetSettings} />
    );
    // changing the selection
    fireEvent.change(getByTestId('comboBoxSearchInput'), {
      target: { value: mockSystemPrompts[1].name },
    });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(mockResetSettings).toHaveBeenCalled();
  });
  it('Creates a new system prompt', () => {
    const { getByTestId } = render(<SystemPromptSelector {...testProps} />);
    const customOption = 'Cool new prompt';
    fireEvent.change(getByTestId('comboBoxSearchInput'), { target: { value: customOption } });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(onSystemPromptSelectionChange).toHaveBeenCalledWith(customOption);
  });
});
