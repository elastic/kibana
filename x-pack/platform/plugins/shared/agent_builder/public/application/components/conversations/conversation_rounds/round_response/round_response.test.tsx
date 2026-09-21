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
import { ChatMessageText } from './chat_message_text';
import { JsonCodeBlock } from '../round_events/json_code_block';

jest.mock('./chat_message_text', () => ({
  ChatMessageText: jest.fn(() => null),
}));

jest.mock('./streaming_text', () => ({
  StreamingText: jest.fn(() => null),
}));

jest.mock('./round_response_actions', () => ({
  RoundResponseActions: jest.fn(() => null),
}));

jest.mock('../round_events/json_code_block', () => ({
  JsonCodeBlock: jest.fn(() => null),
}));

const roundResponseActionsMock = jest.mocked(RoundResponseActions);
const chatMessageTextMock = jest.mocked(ChatMessageText);
const jsonCodeBlockMock = jest.mocked(JsonCodeBlock);

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
    chatMessageTextMock.mockClear();
    jsonCodeBlockMock.mockClear();
  });

  it('renders response actions after a completed response', () => {
    const round = createRound();

    render(
      <RoundResponse
        hasError={false}
        response={round.response}
        steps={round.steps}
        isLoading={false}
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
        rawRound={round}
      />
    );

    expect(roundResponseActionsMock).not.toHaveBeenCalled();
  });

  it('renders ChatMessageText when there is no structured_output', () => {
    const round = createRound();

    render(
      <RoundResponse
        hasError={false}
        response={round.response}
        steps={round.steps}
        isLoading={false}
        rawRound={round}
      />
    );

    expect(chatMessageTextMock).toHaveBeenCalled();
    expect(jsonCodeBlockMock).not.toHaveBeenCalled();
  });

  it('renders JsonCodeBlock instead of ChatMessageText when structured_output is present', () => {
    const round = createRound();
    const structuredOutput = { verdict: 'covered_enabled', rule_id: 'abc-123' };
    round.response = {
      message: JSON.stringify(structuredOutput),
      structured_output: structuredOutput,
    };

    render(
      <RoundResponse
        hasError={false}
        response={round.response}
        steps={round.steps}
        isLoading={false}
        rawRound={round}
      />
    );

    expect(jsonCodeBlockMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: structuredOutput }),
      expect.anything()
    );
    expect(chatMessageTextMock).not.toHaveBeenCalled();
  });

  it('passes formatted JSON to copy action when structured_output is present', () => {
    const round = createRound();
    const structuredOutput = { verdict: 'no_coverage' };
    round.response = {
      message: JSON.stringify(structuredOutput),
      structured_output: structuredOutput,
    };

    render(
      <RoundResponse
        hasError={false}
        response={round.response}
        steps={round.steps}
        isLoading={false}
        rawRound={round}
      />
    );

    expect(roundResponseActionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: JSON.stringify(structuredOutput, null, 2),
      }),
      expect.anything()
    );
  });
});
