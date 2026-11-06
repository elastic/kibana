/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, lastValueFrom, toArray } from 'rxjs';
import type {
  ChatAgentEvent,
  ChatEvent,
  Conversation,
  RoundStartedEvent,
} from '@kbn/agent-builder-common';
import {
  ChatEventType,
  CONVERSATION_SCHEMA_VERSION,
  ConversationRoundStatus,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import { createEmptyConversation, createRound } from '../../../test_utils';
import { executionStartedEvents$ } from './execution_started';

const roundStarted = (overrides: Partial<RoundStartedEvent['data']> = {}): RoundStartedEvent => ({
  type: ChatEventType.roundStarted,
  data: {
    round_id: 'round-1',
    input: { message: 'hi' },
    started_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  },
});

const nonMatching: ChatAgentEvent = {
  type: ChatEventType.messageChunk,
  data: { message_id: 'm', text_chunk: 'chunk' },
} as never;

describe('executionStartedEvents$', () => {
  it('projects a normal-run execution_started with the round`s started_at and user_message trigger', async () => {
    const conversation = createEmptyConversation({ agent_id: 'agent-1' });

    const emitted = await lastValueFrom(
      executionStartedEvents$({
        conversation,
        agentEvents$: from<Array<ChatAgentEvent | ChatEvent>>([
          nonMatching,
          roundStarted({ round_id: 'round-1', started_at: '2026-01-02T00:00:00.000Z' }),
        ]),
      }).pipe(toArray())
    );

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      id: 'round-1::execution_started',
      type: TimelineEventType.executionStarted,
      created_at: '2026-01-02T00:00:00.000Z',
      actor: { type: 'agent', id: 'agent-1' },
      execution_id: 'round-1::execution',
      trigger_event_id: 'round-1::user_message',
      data: { trigger_type: 'user_message' },
    });
  });

  it('projects the events-native resume as exec_1 with a prompt_response trigger', async () => {
    const conversation: Conversation = {
      ...createEmptyConversation({ agent_id: 'agent-1' }),
      schema_version: CONVERSATION_SCHEMA_VERSION,
      rounds: [createRound({ id: 'round-1', status: ConversationRoundStatus.awaitingPrompt })],
      events: [
        {
          id: 'round-1::execution_terminated',
          type: TimelineEventType.executionTerminated,
          created_at: '2026-01-01T00:00:00.000Z',
          actor: { type: 'agent', id: 'agent-1' } as never,
          execution_id: 'round-1::execution',
          trigger_event_id: 'round-1::user_message',
          data: {} as never,
        },
      ] as never,
    };

    const emitted = await lastValueFrom(
      executionStartedEvents$({
        conversation,
        agentEvents$: from<Array<ChatAgentEvent | ChatEvent>>([
          // The runner mints a fresh id for a resume; the projection uses the pending round's id.
          roundStarted({
            round_id: 'ignored-fresh-id',
            started_at: '2026-01-01T00:05:00.000Z',
            resumed: true,
          }),
        ]),
      }).pipe(toArray())
    );

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      id: 'round-1::execution::1::execution_started',
      type: TimelineEventType.executionStarted,
      created_at: '2026-01-01T00:05:00.000Z',
      execution_id: 'round-1::execution::1',
      trigger_event_id: 'round-1::prompt_response::1',
      data: { trigger_type: 'prompt_response' },
    });
  });

  it('falls back to the legacy resume projection (index 0, user_message trigger) for pre events-native docs', async () => {
    // Legacy resume rewrites the round in place: no exec_k on the wire, index stays 0 and the
    // trigger is `user_message`. The projected `started_at` matches what the runner reports now,
    // even though the persisted round keeps the original pause `started_at`.
    const conversation: Conversation = {
      ...createEmptyConversation({ agent_id: 'agent-1' }),
      rounds: [createRound({ id: 'round-1', status: ConversationRoundStatus.awaitingPrompt })],
    };

    const emitted = await lastValueFrom(
      executionStartedEvents$({
        conversation,
        agentEvents$: from<Array<ChatAgentEvent | ChatEvent>>([
          roundStarted({
            round_id: 'ignored-fresh-id',
            started_at: '2026-01-01T00:05:00.000Z',
            resumed: true,
          }),
        ]),
      }).pipe(toArray())
    );

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      id: 'round-1::execution_started',
      execution_id: 'round-1::execution',
      trigger_event_id: 'round-1::user_message',
      data: { trigger_type: 'user_message' },
    });
  });

  it('emits nothing when the agent stream never emits round_started', async () => {
    const conversation = createEmptyConversation({ agent_id: 'agent-1' });

    const emitted = await lastValueFrom(
      executionStartedEvents$({
        conversation,
        agentEvents$: from<Array<ChatAgentEvent | ChatEvent>>([nonMatching]),
      }).pipe(toArray())
    );

    expect(emitted).toEqual([]);
  });
});
