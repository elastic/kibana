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
import { BASE_CONVERSATIONS, Conversation } from '../../../..';
import { DEFAULT_CONVERSATION_TITLE } from '../../use_conversation/translations';

const mockUseAssistantContext = {
  setConversations: jest.fn(),
};
jest.mock('../../../assistant_context', () => {
  const original = jest.requireActual('../../../assistant_context');

  return {
    ...original,
    useAssistantContext: () => mockUseAssistantContext,
  };
});

const mockUseConversation = {
  setApiConfig: jest.fn(),
};
jest.mock('../../use_conversation', () => {
  const original = jest.requireActual('../../use_conversation');

  return {
    ...original,
    useConversation: () => mockUseConversation,
  };
});

const BASE_CONVERSATION: Conversation = {
  ...BASE_CONVERSATIONS[DEFAULT_CONVERSATION_TITLE],
  apiConfig: {
    defaultSystemPrompt: mockSystemPrompt,
  },
};

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
      render(<SystemPrompt conversation={BASE_CONVERSATION} />);
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
    render(<SystemPrompt conversation={BASE_CONVERSATION} />);

    userEvent.click(screen.getByTestId('edit'));

    expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
  });

  it('clears the selected system prompt when the clear button is clicked', () => {
    const apiConfig = { apiConfig: { defaultSystemPrompt: undefined }, conversationId: 'Default' };
    render(<SystemPrompt conversation={BASE_CONVERSATION} />);

    userEvent.click(screen.getByTestId('clear'));

    expect(mockUseConversation.setApiConfig).toHaveBeenCalledWith(apiConfig);
  });

  it('shows the system prompt select when system prompt text is clicked', () => {
    render(<SystemPrompt conversation={BASE_CONVERSATION} />);

    fireEvent.click(screen.getByTestId('systemPromptText'));

    expect(screen.getByTestId('selectSystemPrompt')).toBeInTheDocument();
  });
});
