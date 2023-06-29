/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockSystemPrompt, mockSuperheroSystemPrompt } from '../../../../mock/system_prompt';
import { Props, SelectSystemPrompt } from '.';

const props: Props = {
  selectedPrompt: undefined,
  setSelectedSystemPromptId: jest.fn(),
  setShowSelectSystemPrompt: jest.fn(),
  showSelectSystemPrompt: false,
  systemPrompts: [mockSystemPrompt, mockSuperheroSystemPrompt],
};

describe('SelectSystemPrompt', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the prompt super select when showSelectSystemPrompt is true', () => {
    const { getByTestId } = render(<SelectSystemPrompt {...props} showSelectSystemPrompt={true} />);

    expect(getByTestId('promptSuperSelect')).toBeInTheDocument();
  });

  it('does NOT render the prompt super select when showSelectSystemPrompt is false', () => {
    const { queryByTestId } = render(
      <SelectSystemPrompt {...props} showSelectSystemPrompt={false} />
    );

    expect(queryByTestId('promptSuperSelect')).not.toBeInTheDocument();
  });

  it('renders the clear system prompt button when showSelectSystemPrompt is true', () => {
    const { getByTestId } = render(<SelectSystemPrompt {...props} showSelectSystemPrompt={true} />);

    expect(getByTestId('clearSystemPrompt')).toBeInTheDocument();
  });

  it('does NOT render the clear system prompt button when showSelectSystemPrompt is false', () => {
    const { queryByTestId } = render(
      <SelectSystemPrompt {...props} showSelectSystemPrompt={false} />
    );

    expect(queryByTestId('clearSystemPrompt')).not.toBeInTheDocument();
  });

  it('renders the add system prompt button when showSelectSystemPrompt is false', () => {
    const { getByTestId } = render(
      <SelectSystemPrompt {...props} showSelectSystemPrompt={false} />
    );

    expect(getByTestId('addSystemPrompt')).toBeInTheDocument();
  });

  it('does NOT render the add system prompt button when showSelectSystemPrompt is true', () => {
    const { queryByTestId } = render(
      <SelectSystemPrompt {...props} showSelectSystemPrompt={true} />
    );

    expect(queryByTestId('addSystemPrompt')).not.toBeInTheDocument();
  });

  it('clears the selected system prompt id when the clear button is clicked', () => {
    const setSelectedSystemPromptId = jest.fn();

    const { getByTestId } = render(
      <SelectSystemPrompt
        {...props}
        setSelectedSystemPromptId={setSelectedSystemPromptId}
        showSelectSystemPrompt={true}
      />
    );

    userEvent.click(getByTestId('clearSystemPrompt'));

    expect(setSelectedSystemPromptId).toHaveBeenCalledWith(null);
  });

  it('hides the select when the clear button is clicked', () => {
    const setShowSelectSystemPrompt = jest.fn();

    const { getByTestId } = render(
      <SelectSystemPrompt
        {...props}
        setShowSelectSystemPrompt={setShowSelectSystemPrompt}
        showSelectSystemPrompt={true}
      />
    );

    userEvent.click(getByTestId('clearSystemPrompt'));

    expect(setShowSelectSystemPrompt).toHaveBeenCalledWith(false);
  });

  it('shows the select when the add button is clicked', () => {
    const setShowSelectSystemPrompt = jest.fn();

    const { getByTestId } = render(
      <SelectSystemPrompt
        {...props}
        setShowSelectSystemPrompt={setShowSelectSystemPrompt}
        showSelectSystemPrompt={false}
      />
    );

    userEvent.click(getByTestId('addSystemPrompt'));

    expect(setShowSelectSystemPrompt).toHaveBeenCalledWith(true);
  });
});
