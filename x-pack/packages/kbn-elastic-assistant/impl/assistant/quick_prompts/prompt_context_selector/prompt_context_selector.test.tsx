/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { PromptContextSelector } from './prompt_context_selector';
import { mockPromptContexts } from '../../../mock/prompt_context';

const onPromptContextSelectionChange = jest.fn();
const testProps = {
  promptContexts: mockPromptContexts,
  selectedPromptContexts: [mockPromptContexts[0]],
  onPromptContextSelectionChange,
};

describe('PromptContextSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Selects an existing prompt context and adds it to the previous selection', () => {
    const { getByTestId } = render(<PromptContextSelector {...testProps} />);
    expect(getByTestId('euiComboBoxPill')).toHaveTextContent(mockPromptContexts[0].description);
    fireEvent.click(getByTestId('comboBoxToggleListButton'));
    fireEvent.click(getByTestId(mockPromptContexts[1].description));
    expect(onPromptContextSelectionChange).toHaveBeenCalledWith(mockPromptContexts);
  });

  it('Selects existing prompt context from the search input', () => {
    const { getByTestId } = render(<PromptContextSelector {...testProps} />);
    fireEvent.change(getByTestId('comboBoxSearchInput'), {
      target: { value: mockPromptContexts[1].description },
    });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(onPromptContextSelectionChange).toHaveBeenCalledWith(mockPromptContexts);
  });
  it('Does not support custom options', () => {
    const { getByTestId } = render(<PromptContextSelector {...testProps} />);
    const customOption = 'Cool new prompt';
    fireEvent.change(getByTestId('comboBoxSearchInput'), { target: { value: customOption } });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(onPromptContextSelectionChange).not.toHaveBeenCalled();
  });
});
