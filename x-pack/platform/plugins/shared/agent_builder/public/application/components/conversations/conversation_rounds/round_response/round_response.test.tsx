/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { RoundResponseActions } from './round_response_actions';
import { RoundResponse } from './round_response';

jest.mock('./chat_message_text', () => ({
  ChatMessageText: jest.fn(() => null),
}));

jest.mock('./streaming_text', () => ({
  StreamingText: jest.fn(() => null),
}));

jest.mock('./round_response_actions', () => ({
  RoundResponseActions: jest.fn(() => null),
}));

const roundResponseActionsMock = jest.mocked(RoundResponseActions);

const createRound = (): ConversationRound =>
  ({
    id: 'round-1',
    status: ConversationRoundStatus.completed,
    input: {
      message: 'hello',
    },
    steps: [],
    response: {
      message: 'hi',
    },
    started_at: '2026-01-01T00:00:00.000Z',
    time_to_first_token: 1,
    time_to_last_token: 1,
    model_usage: {
      connector_id: 'connector-1',
      llm_calls: 1,
      input_tokens: 1,
      output_tokens: 1,
    },
  } as ConversationRound);

describe('RoundResponse', () => {
  beforeEach(() => {
    roundResponseActionsMock.mockClear();
  });

  it('renders response actions after a completed response', () => {
    const round = createRound();

    render(
      <RoundResponse
        hasError={false}
        response={round.response}
        steps={round.steps}
        isLoading={false}
        isLastRound={false}
        rawRound={round}
      />
    );

    expect(roundResponseActionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'hi',
        isVisible: true,
        rawRound: round,
      }),
      expect.anything()
    );
  });

  it('does not render response actions while loading', () => {
    const round = createRound();

    render(
      <RoundResponse
        hasError={false}
        response={round.response}
        steps={round.steps}
        isLoading={true}
        isLastRound={false}
        rawRound={round}
      />
    );

    expect(roundResponseActionsMock).not.toHaveBeenCalled();
  });
});
