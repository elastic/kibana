/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Props, SelectSystemPrompt } from '.';

const props: Props = {
  conversation: undefined,
  selectedPrompt: undefined,
};

describe('SelectSystemPrompt', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the prompt super select when isEditing is true', () => {
    const { getByTestId } = render(<SelectSystemPrompt {...props} isEditing={true} />);

    expect(getByTestId('promptSuperSelect')).toBeInTheDocument();
  });

  it('does NOT render the prompt super select when isEditing is false', () => {
    const { queryByTestId } = render(<SelectSystemPrompt {...props} isEditing={false} />);

    expect(queryByTestId('promptSuperSelect')).not.toBeInTheDocument();
  });

  it('renders the clear system prompt button when isEditing is true', () => {
    const { getByTestId } = render(<SelectSystemPrompt {...props} isEditing={true} />);

    expect(getByTestId('clearSystemPrompt')).toBeInTheDocument();
  });

  it('does NOT render the clear system prompt button when isEditing is false', () => {
    const { queryByTestId } = render(<SelectSystemPrompt {...props} isEditing={false} />);

    expect(queryByTestId('clearSystemPrompt')).not.toBeInTheDocument();
  });

  it('renders the add system prompt button when isEditing is false', () => {
    const { getByTestId } = render(<SelectSystemPrompt {...props} isEditing={false} />);

    expect(getByTestId('addSystemPrompt')).toBeInTheDocument();
  });

  it('does NOT render the add system prompt button when isEditing is true', () => {
    const { queryByTestId } = render(<SelectSystemPrompt {...props} isEditing={true} />);

    expect(queryByTestId('addSystemPrompt')).not.toBeInTheDocument();
  });

  it('clears the selected system prompt when the clear button is clicked', () => {
    const clearSelectedSystemPrompt = jest.fn();

    const { getByTestId } = render(
      <SelectSystemPrompt
        {...props}
        clearSelectedSystemPrompt={clearSelectedSystemPrompt}
        isEditing={true}
      />
    );

    userEvent.click(getByTestId('clearSystemPrompt'));

    expect(clearSelectedSystemPrompt).toHaveBeenCalledWith(null);
  });

  it('hides the select when the clear button is clicked', () => {
    const setIsEditing = jest.fn();

    const { getByTestId } = render(
      <SelectSystemPrompt {...props} setIsEditing={setIsEditing} isEditing={true} />
    );

    userEvent.click(getByTestId('clearSystemPrompt'));

    expect(setIsEditing).toHaveBeenCalledWith(false);
  });

  it('shows the select when the add button is clicked', () => {
    const setIsEditing = jest.fn();

    const { getByTestId } = render(
      <SelectSystemPrompt {...props} setIsEditing={setIsEditing} isEditing={false} />
    );

    userEvent.click(getByTestId('addSystemPrompt'));

    expect(setIsEditing).toHaveBeenCalledWith(true);
  });
});
