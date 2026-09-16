/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConversationRoundStatus, type ConversationRound } from '@kbn/agent-builder-common';
import { ConversationRounds } from './conversation_rounds';
import { useConversation, useConversationRounds } from '../../../hooks/use_conversation';
import { pendingRoundId } from '../../../utils/new_conversation';

const mockRoundLayoutMount = jest.fn();

jest.mock('./conversation_date_divider', () => ({
  ConversationDateDivider: ({ date }: { date: string }) => (
    <div data-test-subj="dateDivider" data-date={date} />
  ),
}));

jest.mock('./round_layout', () => {
  const ReactActual = jest.requireActual('react');
  return {
    RoundLayout: ({ rawRound }: { rawRound: ConversationRound }) => {
      ReactActual.useEffect(() => {
        mockRoundLayoutMount();
      }, []);
      return <div data-test-subj="roundLayout" data-round-id={rawRound.id} />;
    },
  };
});

jest.mock('../../../hooks/use_conversation', () => ({
  useConversation: jest.fn(),
  useConversationRounds: jest.fn(),
}));

const useConversationMock = jest.mocked(useConversation);
const useConversationRoundsMock = jest.mocked(useConversationRounds);

const createRound = (id: string, started_at = '2026-01-01T00:00:00.000Z'): ConversationRound => ({
  id,
  status: ConversationRoundStatus.completed,
  input: { message: 'hello' },
  response: { message: 'world' },
  steps: [],
  started_at,
  time_to_first_token: 1,
  time_to_last_token: 1,
  model_usage: {
    connector_id: 'connector-1',
    llm_calls: 1,
    input_tokens: 1,
    output_tokens: 1,
  },
});

describe('ConversationRounds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useConversationMock.mockReturnValue({
      conversation: { id: 'conversation-1' },
    } as ReturnType<typeof useConversation>);
  });

  it('does not remount a round when the pending id is replaced by the persisted id', () => {
    useConversationRoundsMock.mockReturnValue([createRound(pendingRoundId)]);

    const { rerender } = render(
      <ConversationRounds scrollContainerHeight={500} anchoredRoundIndex={0} />
    );
    expect(mockRoundLayoutMount).toHaveBeenCalledTimes(1);

    // The post-stream refetch swaps the optimistic round for the persisted one in place.
    useConversationRoundsMock.mockReturnValue([createRound('round-server-id')]);
    rerender(<ConversationRounds scrollContainerHeight={500} anchoredRoundIndex={0} />);

    expect(mockRoundLayoutMount).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('roundLayout')).toHaveAttribute('data-round-id', 'round-server-id');
  });

  it('gives only the anchored round wrapper the scroll container min-height', () => {
    useConversationRoundsMock.mockReturnValue([createRound('round-1'), createRound('round-2')]);

    render(<ConversationRounds scrollContainerHeight={500} anchoredRoundIndex={1} />);

    const [first, second] = screen.getAllByTestId('agentBuilderRoundWrapper');
    expect(first).not.toHaveStyle({ minHeight: '500px' });
    expect(second).toHaveStyle({ minHeight: '500px' });
  });

  it('gives no round wrapper a min-height when nothing is anchored', () => {
    useConversationRoundsMock.mockReturnValue([createRound('round-1'), createRound('round-2')]);

    render(<ConversationRounds scrollContainerHeight={500} anchoredRoundIndex={null} />);

    for (const el of screen.getAllByTestId('agentBuilderRoundWrapper')) {
      expect(el).not.toHaveStyle({ minHeight: '500px' });
    }
  });

  describe('date dividers', () => {
    it('shows a divider before the first round', () => {
      useConversationRoundsMock.mockReturnValue([
        createRound('round-1', '2026-01-01T10:00:00.000Z'),
      ]);

      render(<ConversationRounds scrollContainerHeight={500} anchoredRoundIndex={null} />);

      expect(screen.getAllByTestId('dateDivider')).toHaveLength(1);
    });

    it('shows a single divider when all rounds fall on the same day', () => {
      useConversationRoundsMock.mockReturnValue([
        createRound('round-1', '2026-01-01T09:00:00.000Z'),
        createRound('round-2', '2026-01-01T14:00:00.000Z'),
        createRound('round-3', '2026-01-01T22:00:00.000Z'),
      ]);

      render(<ConversationRounds scrollContainerHeight={500} anchoredRoundIndex={null} />);

      expect(screen.getAllByTestId('dateDivider')).toHaveLength(1);
    });

    it('shows a divider at each day boundary', () => {
      useConversationRoundsMock.mockReturnValue([
        createRound('round-1', '2026-01-01T23:00:00.000Z'),
        createRound('round-2', '2026-01-02T01:00:00.000Z'),
        createRound('round-3', '2026-01-03T10:00:00.000Z'),
      ]);

      render(<ConversationRounds scrollContainerHeight={500} anchoredRoundIndex={null} />);

      // One divider per distinct day (three different days → three dividers).
      expect(screen.getAllByTestId('dateDivider')).toHaveLength(3);
    });

    it('does not show a mid-group divider when consecutive rounds share a day', () => {
      useConversationRoundsMock.mockReturnValue([
        createRound('round-1', '2026-01-01T08:00:00.000Z'),
        createRound('round-2', '2026-01-01T09:00:00.000Z'), // same day — no new divider
        createRound('round-3', '2026-01-02T10:00:00.000Z'), // new day → divider
      ]);

      render(<ConversationRounds scrollContainerHeight={500} anchoredRoundIndex={null} />);

      expect(screen.getAllByTestId('dateDivider')).toHaveLength(2);
    });
  });
});
