/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RoundThinkingTitle } from './round_thinking_title';
import { useConversationStream } from '../../../../hooks/use_conversation_stream';

jest.mock('./round_icon', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    RoundIcon: jest.fn(({ isLoading }: { isLoading: boolean }) =>
      _React.createElement('div', {
        'data-test-subj': 'round-icon',
        'data-is-loading': String(isLoading),
      })
    ),
  };
});

jest.mock('../../../../hooks/use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));

jest.mock('../../../../../common.styles', () => ({
  lineClampStyles: jest.fn(() => ''),
}));

const mockUseConversationStream = useConversationStream as jest.MockedFunction<
  typeof useConversationStream
>;

const defaultStreamValues = {
  agentReasoning: null,
  cancel: jest.fn(),
  canCancel: false,
  error: undefined,
  isRegenerating: false,
  isResponseLoading: false,
  isResuming: false,
  isStreaming: false,
  pendingMessage: undefined,
  regenerate: jest.fn(),
  removeError: jest.fn(),
  resumeRound: jest.fn(),
  retry: jest.fn(),
  sendMessage: jest.fn(),
  errorSteps: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseConversationStream.mockReturnValue(defaultStreamValues);
});

describe('RoundThinkingTitle', () => {
  describe('label selection', () => {
    it('renders "Waiting for input" when isAwaitingPrompt is true', () => {
      render(
        <RoundThinkingTitle
          hasSteps={false}
          isAwaitingPrompt
          isLoading={false}
          onShow={jest.fn()}
        />
      );

      expect(screen.getByText('Waiting for input')).toBeInTheDocument();
    });

    it('renders "Thinking…" when isLoading is true and no agent reasoning is available', () => {
      render(
        <RoundThinkingTitle
          hasSteps={false}
          isAwaitingPrompt={false}
          isLoading
          onShow={jest.fn()}
        />
      );

      expect(screen.getByText('Thinking…')).toBeInTheDocument();
    });

    it('renders the agent reasoning when isLoading is true and agentReasoning is set', () => {
      mockUseConversationStream.mockReturnValue({
        ...defaultStreamValues,
        agentReasoning: 'Analysing data',
      });

      render(
        <RoundThinkingTitle
          hasSteps={false}
          isAwaitingPrompt={false}
          isLoading
          onShow={jest.fn()}
        />
      );

      expect(screen.getByText('Analysing data…')).toBeInTheDocument();
    });

    it('renders "Completed reasoning" when neither isLoading nor isAwaitingPrompt is true', () => {
      render(
        <RoundThinkingTitle
          hasSteps={false}
          isAwaitingPrompt={false}
          isLoading={false}
          onShow={jest.fn()}
        />
      );

      expect(screen.getByText('Completed reasoning')).toBeInTheDocument();
    });

    it('isAwaitingPrompt takes precedence over isLoading for the label', () => {
      render(<RoundThinkingTitle hasSteps={false} isAwaitingPrompt isLoading onShow={jest.fn()} />);

      expect(screen.getByText('Waiting for input')).toBeInTheDocument();
      expect(screen.queryByText('Thinking…')).not.toBeInTheDocument();
    });
  });

  describe('RoundIcon', () => {
    it('passes isLoading=false to RoundIcon when isAwaitingPrompt is true', () => {
      render(
        <RoundThinkingTitle
          hasSteps={false}
          isAwaitingPrompt
          isLoading={false}
          onShow={jest.fn()}
        />
      );

      expect(screen.getByTestId('round-icon')).toHaveAttribute('data-is-loading', 'false');
    });

    it('passes isLoading=true to RoundIcon when isLoading is true', () => {
      render(
        <RoundThinkingTitle
          hasSteps={false}
          isAwaitingPrompt={false}
          isLoading
          onShow={jest.fn()}
        />
      );

      expect(screen.getByTestId('round-icon')).toHaveAttribute('data-is-loading', 'true');
    });
  });
});
