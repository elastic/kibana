/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ConversationSelectorSettings } from '.';
import { alertConvo, customConvo, welcomeConvo } from '../../../mock/conversation';

const onConversationSelectionChange = jest.fn();
const onConversationDeleted = jest.fn();
const mockConversations = {
  [alertConvo.title]: alertConvo,
  [welcomeConvo.title]: welcomeConvo,
  [customConvo.title]: customConvo,
};
const testProps = {
  conversations: mockConversations,
  selectedConversationTitle: welcomeConvo.title,
  onConversationDeleted,
  onConversationSelectionChange,
};

describe('ConversationSelectorSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Selects an existing conversation', () => {
    const { getByTestId } = render(<ConversationSelectorSettings {...testProps} />);
    expect(getByTestId('comboBoxSearchInput')).toHaveValue(welcomeConvo.title);
    fireEvent.click(getByTestId('comboBoxToggleListButton'));
    fireEvent.click(getByTestId(alertConvo.title));
    expect(onConversationSelectionChange).toHaveBeenCalledWith(alertConvo);
  });
  it('Only custom option can be deleted', () => {
    const { getByTestId } = render(<ConversationSelectorSettings {...testProps} />);
    fireEvent.click(getByTestId('comboBoxToggleListButton'));
    // there is only one delete conversation because there is only one custom convo
    fireEvent.click(getByTestId('delete-conversation'));
    expect(onConversationDeleted).toHaveBeenCalledWith(customConvo.title);
  });
  it('Selects existing conversation from the search  input', () => {
    const { getByTestId } = render(<ConversationSelectorSettings {...testProps} />);
    fireEvent.change(getByTestId('comboBoxSearchInput'), { target: { value: alertConvo.title } });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(onConversationSelectionChange).toHaveBeenCalledWith(alertConvo);
  });
  it('Creates a new conversation', () => {
    const { getByTestId } = render(<ConversationSelectorSettings {...testProps} />);
    const customOption = 'Cool new conversation';
    fireEvent.change(getByTestId('comboBoxSearchInput'), { target: { value: customOption } });
    fireEvent.keyDown(getByTestId('comboBoxSearchInput'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    expect(onConversationSelectionChange).toHaveBeenCalledWith(customOption);
  });

  it('Left arrow selects previous conversation', () => {
    const { getByTestId } = render(<ConversationSelectorSettings {...testProps} />);

    fireEvent.click(getByTestId('arrowLeft'));
    expect(onConversationSelectionChange).toHaveBeenCalledWith(alertConvo);
  });

  it('Right arrow selects next conversation', () => {
    const { getByTestId } = render(<ConversationSelectorSettings {...testProps} />);

    fireEvent.click(getByTestId('arrowRight'));
    expect(onConversationSelectionChange).toHaveBeenCalledWith(customConvo);
  });
});
