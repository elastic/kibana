/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import type { Conversation } from '@kbn/agent-builder-common';
import { useConversation } from './use_conversation';
import { createUserMessageEvent } from '../components/conversations/timeline/items/user_message_event.factory';
import { createExecutionStartedEvent } from '../components/conversations/timeline/items/execution_started.factory';
import { createExecutionStepEvent } from '../components/conversations/timeline/items/execution_step.factory';
import { createExecutionTerminatedEvent } from '../components/conversations/timeline/items/execution_terminated_event.factory';
import { useStepsFromSavedTurns } from './use_steps_from_saved_turns';

jest.mock('./use_conversation', () => ({ useConversation: jest.fn() }));

const turn = (n: number, reasoning: string) => [
  createUserMessageEvent({ id: `user-${n}` }),
  createExecutionStartedEvent({
    id: `started-${n}`,
    execution_id: `execution-${n}`,
    trigger_event_id: `user-${n}`,
  }),
  createExecutionStepEvent({
    id: `step-${n}`,
    execution_id: `execution-${n}`,
    trigger_event_id: `user-${n}`,
    data: { step: { type: ConversationRoundStepType.reasoning, reasoning }, sequence: 0 },
  }),
  createExecutionTerminatedEvent({
    id: `terminated-${n}`,
    execution_id: `execution-${n}`,
    trigger_event_id: `user-${n}`,
  }),
];

const setConversation = (conversation?: Partial<Conversation>) =>
  jest
    .mocked(useConversation)
    .mockReturnValue({ conversation } as ReturnType<typeof useConversation>);

describe('useStepsFromSavedTurns', () => {
  it('returns the steps of every saved turn in order', () => {
    setConversation({ events: [...turn(1, 'first'), ...turn(2, 'second')] } as Conversation);

    const { result } = renderHook(() => useStepsFromSavedTurns());

    expect(result.current).toEqual([
      { type: ConversationRoundStepType.reasoning, reasoning: 'first' },
      { type: ConversationRoundStepType.reasoning, reasoning: 'second' },
    ]);
  });

  it('returns nothing without a conversation', () => {
    setConversation(undefined);

    const { result } = renderHook(() => useStepsFromSavedTurns());

    expect(result.current).toEqual([]);
  });
});
