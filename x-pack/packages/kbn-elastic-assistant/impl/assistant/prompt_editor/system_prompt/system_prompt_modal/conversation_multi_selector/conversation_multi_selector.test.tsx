/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ConversationMultiSelector } from './conversation_multi_selector';
import { alertConvo, welcomeConvo, customConvo } from '../../../../../mock/conversation';

const onConversationSelectionChange = jest.fn();
const testProps = {
  conversations: [alertConvo, welcomeConvo, customConvo],
  onConversationSelectionChange,
  selectedConversations: [welcomeConvo],
};

describe('ConversationMultiSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Selects an existing quick prompt', () => {
    const { getByTestId } = render(<ConversationMultiSelector {...testProps} />);
    expect(getByTestId('euiComboBoxPill')).toHaveTextContent(welcomeConvo.title);
    fireEvent.click(getByTestId('comboBoxToggleListButton'));
    fireEvent.click(getByTestId(`conversationMultiSelectorOption-${alertConvo.title}`));
    expect(onConversationSelectionChange).toHaveBeenCalledWith([alertConvo, welcomeConvo]);
  });

  it('Selects existing conversation from the search  input', () => {
    const { getByTestId } = render(<ConversationMultiSelector {...testProps} />);
    fireEvent.change(getByTestId('comboBoxSearchInput'), {
      target: { value: alertConvo.title },
    });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(onConversationSelectionChange).toHaveBeenCalledWith([alertConvo, welcomeConvo]);
  });
  it('Does not support custom options', () => {
    const { getByTestId } = render(<ConversationMultiSelector {...testProps} />);
    const customOption = 'Cool new prompt';
    fireEvent.change(getByTestId('comboBoxSearchInput'), { target: { value: customOption } });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(onConversationSelectionChange).not.toHaveBeenCalled();
  });
});
