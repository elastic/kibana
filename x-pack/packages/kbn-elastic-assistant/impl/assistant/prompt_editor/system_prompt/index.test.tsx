/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockSystemPrompt } from '../../../mock/system_prompt';
import { SystemPrompt } from '.';
import { BASE_CONVERSATIONS } from '../../../..';
import { DEFAULT_CONVERSATION_TITLE } from '../../use_conversation/translations';

describe('SystemPrompt', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('when conversation is undefined', () => {
    const conversation = undefined;

    beforeEach(() => {
      render(<SystemPrompt conversation={conversation} />);
    });

    it('renders the system prompt select', () => {
      expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
    });

    it('does NOT render the system prompt text', () => {
      expect(screen.queryByTestId('systemPromptText')).not.toBeInTheDocument();
    });

    it('does NOT render the edit button', () => {
      expect(screen.queryByTestId('edit')).not.toBeInTheDocument();
    });

    it('does NOT render the clear button', () => {
      expect(screen.queryByTestId('clear')).not.toBeInTheDocument();
    });
  });

  describe('when conversation is NOT null', () => {
    beforeEach(() => {
      render(<SystemPrompt conversation={BASE_CONVERSATIONS[DEFAULT_CONVERSATION_TITLE]} />);
    });

    it('does NOT render the system prompt select', () => {
      expect(screen.queryByTestId('selectSystemPrompt')).not.toBeInTheDocument();
    });

    it('renders the system prompt text', () => {
      expect(screen.getByTestId('systemPromptText')).toHaveTextContent(mockSystemPrompt.content);
    });

    it('renders the edit button', () => {
      expect(screen.getByTestId('edit')).toBeInTheDocument();
    });

    it('renders the clear button', () => {
      expect(screen.getByTestId('clear')).toBeInTheDocument();
    });
  });

  it('shows the system prompt select when the edit button is clicked', () => {
    render(<SystemPrompt conversation={BASE_CONVERSATIONS[DEFAULT_CONVERSATION_TITLE]} />);

    userEvent.click(screen.getByTestId('edit'));

    expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
  });

  it('clears the selected system prompt when the clear button is clicked', () => {
    const setSelectedSystemPromptId = jest.fn();

    render(<SystemPrompt conversation={BASE_CONVERSATIONS[DEFAULT_CONVERSATION_TITLE]} />);

    userEvent.click(screen.getByTestId('clear'));

    expect(setSelectedSystemPromptId).toHaveBeenCalledWith(null);
  });

  it('shows the system prompt select when system prompt text is clicked', () => {
    render(<SystemPrompt conversation={BASE_CONVERSATIONS[DEFAULT_CONVERSATION_TITLE]} />);

    fireEvent.click(screen.getByTestId('systemPromptText'));

    expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
  });
});
