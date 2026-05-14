/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { RoundResponseProps } from './round_response';
import { RoundResponse } from './round_response';

jest.mock('./streaming_text', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    StreamingText: jest.fn(() =>
      _React.createElement('div', { 'data-test-subj': 'streaming-text' })
    ),
  };
});

jest.mock('./chat_message_text', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    ChatMessageText: jest.fn(() =>
      _React.createElement('div', { 'data-test-subj': 'chat-message-text' })
    ),
  };
});

jest.mock('./round_response_actions', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    RoundResponseActions: jest.fn(() =>
      _React.createElement('div', { 'data-test-subj': 'round-response-actions' })
    ),
  };
});

const defaultProps: RoundResponseProps = {
  attachmentRefs: undefined,
  conversationAttachments: undefined,
  conversationId: undefined,
  hasError: false,
  isLastRound: true,
  isLoading: false,
  response: { message: 'Hello world' },
  steps: [],
};

describe('RoundResponse', () => {
  describe('null when nothing to show', () => {
    it('renders null when message is empty, not loading, and no error', () => {
      const { container } = render(
        <RoundResponse
          {...defaultProps}
          hasError={false}
          isLoading={false}
          response={{ message: '' }}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('renders null when message is undefined-like (empty string), not loading, and no error', () => {
      const { container } = render(
        <RoundResponse
          {...defaultProps}
          hasError={false}
          isLoading={false}
          response={{ message: '' }}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('renders when there is content', () => {
    it('renders the assistant response container when message is non-empty', () => {
      render(<RoundResponse {...defaultProps} response={{ message: 'Hello' }} />);

      expect(screen.getByTestId('agentBuilderRoundResponse')).toBeInTheDocument();
    });

    it('renders StreamingText when isLoading is true (even with empty message)', () => {
      render(<RoundResponse {...defaultProps} isLoading response={{ message: '' }} />);

      expect(screen.getByTestId('agentBuilderRoundResponse')).toBeInTheDocument();
      expect(screen.getByTestId('streaming-text')).toBeInTheDocument();
    });

    it('renders the assistant response container when hasError is true (even with empty message)', () => {
      render(
        <RoundResponse {...defaultProps} hasError isLoading={false} response={{ message: '' }} />
      );

      expect(screen.getByTestId('agentBuilderRoundResponse')).toBeInTheDocument();
    });

    it('renders ChatMessageText (not StreamingText) when not loading', () => {
      render(<RoundResponse {...defaultProps} isLoading={false} response={{ message: 'Hi' }} />);

      expect(screen.getByTestId('chat-message-text')).toBeInTheDocument();
      expect(screen.queryByTestId('streaming-text')).not.toBeInTheDocument();
    });
  });
});
