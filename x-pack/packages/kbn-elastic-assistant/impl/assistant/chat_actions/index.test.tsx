/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
import { ChatActions } from '.';

const onChatCleared = jest.fn();
const onSendMessage = jest.fn();
const testProps = {
  isDisabled: false,
  isLoading: false,
  onChatCleared,
  onSendMessage,
};

describe('ChatActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('the component renders with all props', () => {
    const { getByTestId } = render(<ChatActions {...testProps} />);
    expect(getByTestId('clear-chat')).toHaveAttribute('aria-label', 'Clear chat');
    expect(getByTestId('submit-chat')).toHaveAttribute('aria-label', 'Submit message');
  });

  it('onChatCleared function is called when clear chat button is clicked', () => {
    const { getByTestId } = render(<ChatActions {...testProps} />);
    fireEvent.click(getByTestId('clear-chat'));
    expect(onChatCleared).toHaveBeenCalled();
  });

  it('onSendMessage function is called when send message button is clicked', () => {
    const { getByTestId } = render(<ChatActions {...testProps} />);

    fireEvent.click(getByTestId('submit-chat'));
    expect(onSendMessage).toHaveBeenCalled();
  });

  it('buttons are disabled when isDisabled prop is true', () => {
    const props = {
      ...testProps,
      isDisabled: true,
    };
    const { getByTestId } = render(<ChatActions {...props} />);
    expect(getByTestId('clear-chat')).toBeDisabled();
    expect(getByTestId('submit-chat')).toBeDisabled();
  });

  it('send message button is in loading state when isLoading prop is true', () => {
    const props = {
      ...testProps,
      isLoading: true,
    };
    const { getByTestId } = render(<ChatActions {...props} />);
    expect(within(getByTestId('submit-chat')).getByRole('progressbar')).toBeInTheDocument();
  });
});
