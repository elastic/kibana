/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRoundStep,
  ExecutionOutcome,
  RoundModelUsageStats,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
} from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { eventsToRounds } from './events_to_rounds';

const usage: RoundModelUsageStats = {
  connector_id: 'c1',
  llm_calls: 1,
  input_tokens: 5,
  output_tokens: 5,
};

const userActor = { type: EventActorType.user, id: 'u1', username: 'user1' };
const agentActor = { type: EventActorType.agent, id: 'agent-1' };

const step = (s: Partial<ConversationRoundStep> & { type: ConversationRoundStepType }) =>
  s as unknown as ConversationRoundStep;

const toolStep = (toolCallId: string, results: unknown[]) =>
  step({
    type: ConversationRoundStepType.toolCall,
    tool_call_id: toolCallId,
    tool_id: 'my_tool',
    params: {},
    results,
  } as never);

const askStep = (promptId: string, answers?: unknown) =>
  step({
    type: ConversationRoundStepType.askUserQuestion,
    prompt_id: promptId,
    questions: [{ question: 'q', options: [{ label: 'a' }, { label: 'b' }], multi_select: false }],
    ...(answers ? { answers } : {}),
  } as never);

const reasoningStep = (text: string) =>
  step({ type: ConversationRoundStepType.reasoning, reasoning: text } as never);

/** Build the events for one execution: started + step events + terminated. */
const executionEvents = ({
  roundId,
  executionId,
  triggerEventId,
  triggerType,
  steps,
  outcome,
  createdAt,
}: {
  roundId: string;
  executionId: string;
  triggerEventId: string;
  triggerType: TimelineTriggerType;
  steps: ConversationRoundStep[];
  outcome: ExecutionOutcome;
  createdAt: string;
}): TimelineEvent[] => {
  const idPrefix = executionId; // e.g. `${roundId}::execution` or `${roundId}::execution::1`
  return [
    {
      id: `${idPrefix}::execution_started`,
      type: TimelineEventType.executionStarted,
      created_at: createdAt,
      actor: agentActor,
      execution_id: executionId,
      trigger_event_id: triggerEventId,
      data: { trigger_type: triggerType },
    },
    ...steps.map((s, i) => ({
      id: `${idPrefix}::step::${i}`,
      type: TimelineEventType.executionStep as const,
      created_at: createdAt,
      actor: agentActor,
      execution_id: executionId,
      trigger_event_id: triggerEventId,
      data: { step: s, sequence: i },
    })),
    {
      id: `${idPrefix}::execution_terminated`,
      type: TimelineEventType.executionTerminated,
      created_at: createdAt,
      actor: agentActor,
      execution_id: executionId,
      trigger_event_id: triggerEventId,
      data: {
        model_usage: usage,
        time_to_first_token: 10,
        time_to_last_token: 100,
        outcome,
      },
    },
  ] as TimelineEvent[];
};

describe('eventsToRounds — multi-execution HITL fold', () => {
  it('folds an ask_user_question pause + resume into one round with the answer applied', () => {
    const events: TimelineEvent[] = [
      {
        id: 'r1::user_message',
        type: TimelineEventType.userMessage,
        created_at: '2024-01-01T00:00:00.000Z',
        actor: userActor,
        data: { message: 'hi' },
      },
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution',
        triggerEventId: 'r1::user_message',
        triggerType: TimelineTriggerType.userMessage,
        steps: [askStep('p1')],
        outcome: {
          type: 'prompt_requested',
          prompts: [{ type: AgentPromptType.ask_user_question, id: 'p1', questions: [] }],
        },
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
      {
        id: 'r1::prompt_response::1',
        type: TimelineEventType.promptResponse,
        created_at: '2024-01-01T00:05:00.000Z',
        actor: userActor,
        data: {
          prompt_requested_event_id: 'r1::execution::execution_terminated',
          responses: { p1: { answers: [{ choice: [0] }] } },
        },
      },
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::1',
        triggerEventId: 'r1::prompt_response::1',
        triggerType: TimelineTriggerType.promptResponse,
        steps: [reasoningStep('now I can answer')],
        outcome: { type: 'responded', response: { message: 'the final answer' } },
        createdAt: '2024-01-01T00:05:00.000Z',
      }),
    ];

    const rounds = eventsToRounds(events);

    expect(rounds).toHaveLength(1);
    const round = rounds[0];
    expect(round.id).toBe('r1');
    expect(round.input).toEqual({ message: 'hi' });
    expect(round.author).toEqual({ id: 'u1', username: 'user1' });
    expect(round.status).toBe(ConversationRoundStatus.completed);
    expect(round.response).toEqual({ message: 'the final answer' });
    // the paused ask is answered, followed by the resume execution's step
    const ask = round.steps.find((s) => s.type === ConversationRoundStepType.askUserQuestion);
    expect(ask).toMatchObject({ prompt_id: 'p1', answers: [{ choice: [0] }] });
    expect(round.steps.map((s) => s.type)).toEqual([
      ConversationRoundStepType.askUserQuestion,
      ConversationRoundStepType.reasoning,
    ]);
    // counters summed across both executions
    expect(round.time_to_last_token).toBe(200);
    expect(round.model_usage.llm_calls).toBe(2);
  });

  it('folds a tool-call confirmation pause + resume, resolving the call in its original position', () => {
    const events: TimelineEvent[] = [
      {
        id: 'r1::user_message',
        type: TimelineEventType.userMessage,
        created_at: '2024-01-01T00:00:00.000Z',
        actor: userActor,
        data: { message: 'delete it' },
      },
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution',
        triggerEventId: 'r1::user_message',
        triggerType: TimelineTriggerType.userMessage,
        // the tool call is made but paused for confirmation — empty results
        steps: [toolStep('call-1', [])],
        outcome: {
          type: 'prompt_requested',
          prompts: [{ type: AgentPromptType.confirmation, id: 'tools.my_tool.confirmation' }],
        },
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
      {
        id: 'r1::prompt_response::1',
        type: TimelineEventType.promptResponse,
        created_at: '2024-01-01T00:05:00.000Z',
        actor: userActor,
        data: {
          prompt_requested_event_id: 'r1::execution::execution_terminated',
          responses: { 'tools.my_tool.confirmation': { allow: true } },
        },
      },
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::1',
        triggerEventId: 'r1::prompt_response::1',
        triggerType: TimelineTriggerType.promptResponse,
        // exec_k carries the resolved copy of call-1 (leading) then a follow-up reasoning step
        steps: [toolStep('call-1', [{ type: 'other', data: 'deleted' }]), reasoningStep('done')],
        outcome: { type: 'responded', response: { message: 'deleted it' } },
        createdAt: '2024-01-01T00:05:00.000Z',
      }),
    ];

    const rounds = eventsToRounds(events);

    expect(rounds).toHaveLength(1);
    const round = rounds[0];
    expect(round.status).toBe(ConversationRoundStatus.completed);
    // call-1 appears once (its original position), now resolved; no duplicate from exec_k
    const toolSteps = round.steps.filter((s) => s.type === ConversationRoundStepType.toolCall);
    expect(toolSteps).toHaveLength(1);
    expect(toolSteps[0]).toMatchObject({
      tool_call_id: 'call-1',
      results: [{ type: 'other', data: 'deleted' }],
    });
    expect(round.steps[0]).toMatchObject({ tool_call_id: 'call-1' });
    expect(round.steps.map((s) => s.type)).toEqual([
      ConversationRoundStepType.toolCall,
      ConversationRoundStepType.reasoning,
    ]);
  });

  it('reconstructs two independent single-execution rounds unchanged', () => {
    const events: TimelineEvent[] = [
      {
        id: 'a::user_message',
        type: TimelineEventType.userMessage,
        created_at: '2024-01-01T00:00:00.000Z',
        actor: userActor,
        data: { message: 'one' },
      },
      ...executionEvents({
        roundId: 'a',
        executionId: 'a::execution',
        triggerEventId: 'a::user_message',
        triggerType: TimelineTriggerType.userMessage,
        steps: [reasoningStep('r')],
        outcome: { type: 'responded', response: { message: 'first' } },
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
      {
        id: 'b::user_message',
        type: TimelineEventType.userMessage,
        created_at: '2024-01-01T00:10:00.000Z',
        actor: userActor,
        data: { message: 'two' },
      },
      ...executionEvents({
        roundId: 'b',
        executionId: 'b::execution',
        triggerEventId: 'b::user_message',
        triggerType: TimelineTriggerType.userMessage,
        steps: [reasoningStep('r2')],
        outcome: { type: 'responded', response: { message: 'second' } },
        createdAt: '2024-01-01T00:10:00.000Z',
      }),
    ];

    const rounds = eventsToRounds(events);
    expect(rounds.map((r) => r.id)).toEqual(['a', 'b']);
    expect(rounds.map((r) => r.response.message)).toEqual(['first', 'second']);
  });
});
