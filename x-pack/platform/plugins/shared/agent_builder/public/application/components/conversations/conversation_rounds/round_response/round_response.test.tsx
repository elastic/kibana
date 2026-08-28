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
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import { useAgentBuilderAgentById } from '../../../../hooks/agents/use_agent_by_id';
import { useAgentId } from '../../../../hooks/use_conversation';
import { RoundAuthorHeader } from '../round_author_header';
import { RoundResponse } from './round_response';

jest.mock('../../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: jest.fn(),
}));

jest.mock('../../../../hooks/use_conversation', () => ({
  useAgentId: jest.fn(),
}));

jest.mock('../round_author_header', () => ({
  RoundAuthorHeader: jest.fn(() => null),
}));

jest.mock('./chat_message_text', () => ({
  ChatMessageText: () => null,
}));

jest.mock('./streaming_text', () => ({
  StreamingText: () => null,
}));

jest.mock('./round_response_actions', () => ({
  RoundResponseActions: () => null,
}));

const useAgentIdMock = jest.mocked(useAgentId);
const useAgentBuilderAgentByIdMock = jest.mocked(useAgentBuilderAgentById);
const roundAuthorHeaderMock = jest.mocked(RoundAuthorHeader);
const agent: AgentDefinition = {
  id: 'agent-1',
  type: 'chat',
  name: 'Threat Hunting Agent',
  description: '',
  readonly: false,
  configuration: {
    tools: [],
  },
};

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
    useAgentIdMock.mockReturnValue('agent-1');
    useAgentBuilderAgentByIdMock.mockReturnValue({
      agent,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAgentBuilderAgentById>);
    roundAuthorHeaderMock.mockClear();
  });

  it('passes the current agent name to the author header', () => {
    const round = createRound();

    render(
      <RoundResponse
        hasError={false}
        response={round.response}
        steps={round.steps}
        isLoading={false}
        isLastRound={false}
        rawRound={round}
        startedAt={round.started_at}
      />
    );

    expect(useAgentBuilderAgentByIdMock).toHaveBeenCalledWith('agent-1');
    expect(roundAuthorHeaderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: 'agent',
        agent,
      }),
      expect.anything()
    );
  });
});
