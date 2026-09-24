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
  ZERO_MODEL_USAGE,
} from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import {
  pauseState,
  promptResponseEvent as promptResponse,
  userMessageEvent as userMessage,
} from '../../../test_utils/timeline';
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
  const idPrefix = executionId === `${roundId}::execution` ? roundId : executionId;
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

/** Local sibling of `executionEvents`: started + step events + failed/aborted terminal. */
const interruptedExecutionEvents = ({
  roundId,
  executionId,
  triggerEventId,
  triggerType,
  steps,
  interruption,
  createdAt,
  modelUsage,
  timeToFirstToken,
}: {
  roundId: string;
  executionId: string;
  triggerEventId: string;
  triggerType: TimelineTriggerType;
  steps: ConversationRoundStep[];
  interruption:
    | { type: 'failed'; error: { code: string; message: string } }
    | { type: 'aborted'; aborted_by?: { source: 'api' } };
  createdAt: string;
  modelUsage?: RoundModelUsageStats;
  timeToFirstToken?: number;
}): TimelineEvent[] => {
  const idPrefix = executionId === `${roundId}::execution` ? roundId : executionId;
  const summary = {
    time_to_last_token: 100,
    ...(modelUsage ? { model_usage: modelUsage } : {}),
    ...(timeToFirstToken !== undefined ? { time_to_first_token: timeToFirstToken } : {}),
  };
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
    interruption.type === 'failed'
      ? {
          id: `${idPrefix}::execution_failed`,
          type: TimelineEventType.executionFailed,
          created_at: createdAt,
          actor: agentActor,
          execution_id: executionId,
          trigger_event_id: triggerEventId,
          data: { ...summary, error: interruption.error },
        }
      : {
          id: `${idPrefix}::execution_aborted`,
          type: TimelineEventType.executionAborted,
          created_at: createdAt,
          actor: agentActor,
          execution_id: executionId,
          trigger_event_id: triggerEventId,
          data: {
            ...summary,
            ...(interruption.aborted_by ? { aborted_by: interruption.aborted_by } : {}),
          },
        },
  ] as TimelineEvent[];
};

describe('eventsToRounds — interrupted executions', () => {
  const T0 = '2026-01-01T00:00:00.000Z';
  const T1 = '2026-01-01T00:01:00.000Z';
  const boom = { code: 'internalError', message: 'boom' };

  it('folds a failed exec_0 into a completed round with interruption, steps and defaults', () => {
    const rounds = eventsToRounds([
      userMessage('r1', T0),
      ...interruptedExecutionEvents({
        roundId: 'r1',
        executionId: 'r1::execution',
        triggerEventId: 'r1::user_message',
        triggerType: TimelineTriggerType.userMessage,
        steps: [reasoningStep('thinking'), toolStep('tc1', [])],
        interruption: { type: 'failed', error: boom },
        createdAt: T0,
      }),
    ]);
    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toMatchObject({
      id: 'r1',
      status: ConversationRoundStatus.completed,
      response: { message: '' },
      interruption: { type: 'failed', error: boom },
      time_to_first_token: 0,
      time_to_last_token: 100,
      model_usage: ZERO_MODEL_USAGE,
    });
    expect(rounds[0].steps).toHaveLength(2);
    expect(rounds[0].state).toBeUndefined();
    expect(rounds[0].pending_prompts).toBeUndefined();
  });

  it('folds an aborted exec_0 keeping aborted_by and the terminal model usage', () => {
    const [round] = eventsToRounds([
      userMessage('r1', T0),
      ...interruptedExecutionEvents({
        roundId: 'r1',
        executionId: 'r1::execution',
        triggerEventId: 'r1::user_message',
        triggerType: TimelineTriggerType.userMessage,
        steps: [],
        interruption: { type: 'aborted', aborted_by: { source: 'api' } },
        createdAt: T0,
        modelUsage: usage,
      }),
    ]);
    expect(round.interruption).toEqual({ type: 'aborted', aborted_by: { source: 'api' } });
    expect(round.model_usage).toEqual(usage);
  });

  it('exec_0 paused + exec_1 interrupted → completed with interruption, merged steps, summed usage, prompt consumed', () => {
    const rounds = eventsToRounds([
      userMessage('r1', T0),
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution',
        triggerEventId: 'r1::user_message',
        triggerType: TimelineTriggerType.userMessage,
        steps: [toolStep('tc1', [])],
        outcome: {
          type: 'prompt_requested',
          prompts: [{ id: 'p', type: AgentPromptType.confirmation, tool_call_id: 'tc1' } as never],
        },
        createdAt: T0,
      }),
      promptResponse('r1', 1, 'r1::execution_terminated', T1),
      ...interruptedExecutionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::1',
        triggerEventId: 'r1::prompt_response::1',
        triggerType: TimelineTriggerType.promptResponse,
        steps: [
          toolStep('tc1', [{ type: 'other', tool_result_id: 'x', data: {} }]),
          reasoningStep('after'),
        ],
        interruption: { type: 'failed', error: boom },
        createdAt: T1,
        modelUsage: usage,
      }),
    ]);
    expect(rounds).toHaveLength(1);
    const [round] = rounds;
    expect(round.status).toBe(ConversationRoundStatus.completed);
    expect(round.interruption).toEqual({ type: 'failed', error: boom });
    expect(round.pending_prompts).toBeUndefined();
    expect(round.state).toBeUndefined();
    expect(
      round.steps.map(
        (s) =>
          (s as { tool_call_id?: string; reasoning?: string }).tool_call_id ??
          (s as { reasoning: string }).reasoning
      )
    ).toEqual(['tc1', 'after']);
    expect(round.model_usage.llm_calls).toBe(2);
    expect(round.time_to_first_token).toBe(10);
  });

  it('exec_0 paused with no prompt_response stays awaiting_prompt', () => {
    const [round] = eventsToRounds([
      userMessage('r1', T0),
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution',
        triggerEventId: 'r1::user_message',
        triggerType: TimelineTriggerType.userMessage,
        steps: [],
        outcome: { type: 'prompt_requested', prompts: [] },
        createdAt: T0,
      }),
    ]);
    expect(round.status).toBe(ConversationRoundStatus.awaitingPrompt);
  });

  it('a dangling prompt_response consumes the pause (completed, empty response)', () => {
    const [round] = eventsToRounds([
      userMessage('r1', T0),
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution',
        triggerEventId: 'r1::user_message',
        triggerType: TimelineTriggerType.userMessage,
        steps: [],
        outcome: { type: 'prompt_requested', prompts: [] },
        createdAt: T0,
      }),
      promptResponse('r1', 1, 'r1::execution_terminated', T1),
    ]);
    expect(round.status).toBe(ConversationRoundStatus.completed);
    expect(round.response).toEqual({ message: '' });
    expect(round.pending_prompts).toBeUndefined();
    expect(round.interruption).toBeUndefined();
  });

  it('skips an orphan interrupted exec_k and an in-progress round', () => {
    expect(
      eventsToRounds([
        promptResponse('r1', 1, 'r1::execution_terminated', T1),
        ...interruptedExecutionEvents({
          roundId: 'r1',
          executionId: 'r1::execution::1',
          triggerEventId: 'r1::prompt_response::1',
          triggerType: TimelineTriggerType.promptResponse,
          steps: [],
          interruption: { type: 'failed', error: boom },
          createdAt: T1,
        }),
      ])
    ).toEqual([]);
    expect(eventsToRounds([userMessage('r1', T0)])).toEqual([]);
  });

  it('old shape: exec_0 paused, exec_1 failed, exec_2 paused → awaiting_prompt on exec_2', () => {
    const [round] = eventsToRounds([
      userMessage('r1', T0),
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution',
        triggerEventId: 'r1::user_message',
        triggerType: TimelineTriggerType.userMessage,
        steps: [],
        outcome: { type: 'prompt_requested', prompts: [] },
        createdAt: T0,
      }),
      promptResponse('r1', 1, 'r1::execution_terminated', T1),
      ...interruptedExecutionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::1',
        triggerEventId: 'r1::prompt_response::1',
        triggerType: TimelineTriggerType.promptResponse,
        steps: [],
        interruption: { type: 'failed', error: boom },
        createdAt: T1,
      }),
      promptResponse('r1', 2, 'r1::execution_terminated', T1),
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::2',
        triggerEventId: 'r1::prompt_response::2',
        triggerType: TimelineTriggerType.promptResponse,
        steps: [],
        outcome: {
          type: 'prompt_requested',
          prompts: [{ id: 'p2', type: AgentPromptType.ask_user_question, questions: [] } as never],
        },
        createdAt: T1,
      }),
    ]);
    expect(round.status).toBe(ConversationRoundStatus.awaitingPrompt);
    expect(round.pending_prompts?.[0].id).toBe('p2');
    expect(round.interruption).toBeUndefined();
  });

  it('marks the paused calls an interrupted resume never reached, leaves an unmarked empty return alone', () => {
    const pausedTerminal = executionEvents({
      roundId: 'r1',
      executionId: 'r1::execution',
      triggerEventId: 'r1::user_message',
      triggerType: TimelineTriggerType.userMessage,
      steps: [toolStep('tc1', []), toolStep('tc2', [])],
      outcome: { type: 'prompt_requested', prompts: [] },
      createdAt: T0,
    });
    // attach the pause state naming both calls to the terminal
    const terminated = pausedTerminal[pausedTerminal.length - 1] as TimelineEvent & {
      data: Record<string, unknown>;
    };
    terminated.data = { ...terminated.data, state: pauseState(['tc1', 'tc2']) };

    const [round] = eventsToRounds([
      userMessage('r1', T0),
      ...pausedTerminal,
      promptResponse('r1', 1, 'r1::execution_terminated', T1),
      ...interruptedExecutionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::1',
        triggerEventId: 'r1::prompt_response::1',
        triggerType: TimelineTriggerType.promptResponse,
        // tc2 has an unmarked copy with an empty return; tc1 has no copy
        steps: [toolStep('tc2', [])],
        interruption: { type: 'aborted' },
        createdAt: T1,
      }),
    ]);
    const byId = new Map(round.steps.map((s) => [(s as { tool_call_id: string }).tool_call_id, s]));
    expect((byId.get('tc1') as { interrupted?: true }).interrupted).toBe(true);
    expect((byId.get('tc2') as { interrupted?: true }).interrupted).toBeUndefined();
  });

  it('a successful retry after an interrupted resume clears the mark on the resolved call (legacy history)', () => {
    // Before interrupted executions folded into rounds, a failed resume left the round awaiting
    // the prompt and the user answered again: exec_0 paused, exec_1 failed, exec_2 completed.
    const T2 = '2026-01-01T00:02:00.000Z';
    const pausedTerminal = executionEvents({
      roundId: 'r1',
      executionId: 'r1::execution',
      triggerEventId: 'r1::user_message',
      triggerType: TimelineTriggerType.userMessage,
      steps: [toolStep('tc1', [])],
      outcome: { type: 'prompt_requested', prompts: [] },
      createdAt: T0,
    });
    const terminated = pausedTerminal[pausedTerminal.length - 1] as TimelineEvent & {
      data: Record<string, unknown>;
    };
    terminated.data = { ...terminated.data, state: pauseState(['tc1']) };
    const [round] = eventsToRounds([
      userMessage('r1', T0),
      ...pausedTerminal,
      promptResponse('r1', 1, 'r1::execution_terminated', T1),
      ...interruptedExecutionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::1',
        triggerEventId: 'r1::prompt_response::1',
        triggerType: TimelineTriggerType.promptResponse,
        steps: [],
        interruption: { type: 'failed', error: boom },
        createdAt: T1,
      }),
      promptResponse('r1', 2, 'r1::execution_terminated', T2),
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::2',
        triggerEventId: 'r1::prompt_response::2',
        triggerType: TimelineTriggerType.promptResponse,
        steps: [toolStep('tc1', [{ ok: true }])],
        outcome: { type: 'responded', response: { message: 'done' } },
        createdAt: T2,
      }),
    ]);
    expect(round.status).toBe(ConversationRoundStatus.completed);
    expect(round.interruption).toBeUndefined();
    expect(round.response.message).toBe('done');
    expect(round.steps).toHaveLength(1);
    expect(round.steps[0]).not.toHaveProperty('interrupted');
    expect((round.steps[0] as { results: unknown[] }).results).toEqual([{ ok: true }]);
  });

  it('a setup-window failure (no exec_k steps) marks every paused call', () => {
    const pausedTerminal = executionEvents({
      roundId: 'r1',
      executionId: 'r1::execution',
      triggerEventId: 'r1::user_message',
      triggerType: TimelineTriggerType.userMessage,
      steps: [toolStep('tc1', [])],
      outcome: { type: 'prompt_requested', prompts: [] },
      createdAt: T0,
    });
    const terminated = pausedTerminal[pausedTerminal.length - 1] as TimelineEvent & {
      data: Record<string, unknown>;
    };
    terminated.data = { ...terminated.data, state: pauseState(['tc1']) };
    const [round] = eventsToRounds([
      userMessage('r1', T0),
      ...pausedTerminal,
      promptResponse('r1', 1, 'r1::execution_terminated', T1),
      ...interruptedExecutionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::1',
        triggerEventId: 'r1::prompt_response::1',
        triggerType: TimelineTriggerType.promptResponse,
        steps: [],
        interruption: { type: 'failed', error: boom },
        createdAt: T1,
      }),
    ]);
    expect((round.steps[0] as { interrupted?: true }).interrupted).toBe(true);
    expect(round.model_usage).toEqual(usage); // exec_0's usage + ZERO
  });
});

describe('eventsToRounds — multi-execution HITL fold', () => {
  it('ignores an orphan resume without its initial execution', () => {
    const events: TimelineEvent[] = [
      {
        id: 'r1::prompt_response::1',
        type: TimelineEventType.promptResponse,
        created_at: '2024-01-01T00:00:00.000Z',
        actor: userActor,
        data: { prompt_requested_event_id: 'r1::execution_terminated', responses: {} },
      },
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::1',
        triggerEventId: 'r1::prompt_response::1',
        triggerType: TimelineTriggerType.promptResponse,
        steps: [],
        outcome: { type: 'responded', response: { message: 'done' } },
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
    ];
    expect(eventsToRounds(events)).toEqual([]);
  });

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
          prompt_requested_event_id: 'r1::execution_terminated',
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
          prompt_requested_event_id: 'r1::execution_terminated',
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

  it("recovers the resume's own input (message + attachment_refs) from the prompt_response", () => {
    const events: TimelineEvent[] = [
      {
        id: 'r1::user_message',
        type: TimelineEventType.userMessage,
        created_at: '2024-01-01T00:00:00.000Z',
        actor: userActor,
        data: { message: 'hi', attachment_refs: [{ attachment_id: 'att-1', version: 1 }] },
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
          prompt_requested_event_id: 'r1::execution_terminated',
          responses: { p1: { answers: [{ choice: [0] }] } },
          // the resume also carried a message + accessed a new attachment
          input: {
            message: 'also check X',
            attachment_refs: [{ attachment_id: 'att-2', version: 1 }],
          },
        },
      },
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::1',
        triggerEventId: 'r1::prompt_response::1',
        triggerType: TimelineTriggerType.promptResponse,
        steps: [reasoningStep('done')],
        outcome: { type: 'responded', response: { message: 'ok' } },
        createdAt: '2024-01-01T00:05:00.000Z',
      }),
    ];

    const round = eventsToRounds(events)[0];
    // mergeRoundInput: resume message wins, attachment_refs are unioned across both executions
    expect(round.input.message).toBe('also check X');
    expect(round.input.attachment_refs).toEqual([
      { attachment_id: 'att-1', version: 1 },
      { attachment_id: 'att-2', version: 1 },
    ]);
  });

  it('folds a re-pause chain (exec_0 -> exec_1 -> exec_2) into one completed round', () => {
    const events: TimelineEvent[] = [
      {
        id: 'r1::user_message',
        type: TimelineEventType.userMessage,
        created_at: '2024-01-01T00:00:00.000Z',
        actor: userActor,
        data: { message: 'go' },
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
          prompt_requested_event_id: 'r1::execution_terminated',
          responses: { p1: { answers: [{ choice: [0] }] } },
        },
      },
      // exec_1 answers p1 but pauses again on p2
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::1',
        triggerEventId: 'r1::prompt_response::1',
        triggerType: TimelineTriggerType.promptResponse,
        steps: [askStep('p2')],
        outcome: {
          type: 'prompt_requested',
          prompts: [{ type: AgentPromptType.ask_user_question, id: 'p2', questions: [] }],
        },
        createdAt: '2024-01-01T00:05:00.000Z',
      }),
      {
        id: 'r1::prompt_response::2',
        type: TimelineEventType.promptResponse,
        created_at: '2024-01-01T00:10:00.000Z',
        actor: userActor,
        data: {
          prompt_requested_event_id: 'r1::execution::1::execution_terminated',
          responses: { p2: { answers: [{ choice: [1] }] } },
        },
      },
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::2',
        triggerEventId: 'r1::prompt_response::2',
        triggerType: TimelineTriggerType.promptResponse,
        steps: [reasoningStep('finally')],
        outcome: { type: 'responded', response: { message: 'all done' } },
        createdAt: '2024-01-01T00:10:00.000Z',
      }),
    ];

    const rounds = eventsToRounds(events);
    expect(rounds).toHaveLength(1);
    const round = rounds[0];
    expect(round.status).toBe(ConversationRoundStatus.completed);
    expect(round.response).toEqual({ message: 'all done' });
    const asks = round.steps.filter((s) => s.type === ConversationRoundStepType.askUserQuestion);
    expect(asks).toHaveLength(2);
    expect(asks.map((a) => (a as { answers?: unknown }).answers)).toEqual([
      [{ choice: [0] }],
      [{ choice: [1] }],
    ]);
    // counters summed across all three executions
    expect(round.time_to_last_token).toBe(300);
    expect(round.model_usage.llm_calls).toBe(3);
  });

  it('folds a denied tool-call resume (error result) into one completed round', () => {
    const events: TimelineEvent[] = [
      {
        id: 'r1::user_message',
        type: TimelineEventType.userMessage,
        created_at: '2024-01-01T00:00:00.000Z',
        actor: userActor,
        data: { message: 'delete prod' },
      },
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution',
        triggerEventId: 'r1::user_message',
        triggerType: TimelineTriggerType.userMessage,
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
          prompt_requested_event_id: 'r1::execution_terminated',
          responses: { 'tools.my_tool.confirmation': { allow: false } },
        },
      },
      // deny still re-runs the tool, which short-circuits to an error result
      ...executionEvents({
        roundId: 'r1',
        executionId: 'r1::execution::1',
        triggerEventId: 'r1::prompt_response::1',
        triggerType: TimelineTriggerType.promptResponse,
        steps: [toolStep('call-1', [{ type: 'error', message: 'The user chose not to proceed.' }])],
        outcome: { type: 'responded', response: { message: 'not done' } },
        createdAt: '2024-01-01T00:05:00.000Z',
      }),
    ];

    const round = eventsToRounds(events)[0];
    expect(round.status).toBe(ConversationRoundStatus.completed);
    const toolSteps = round.steps.filter((s) => s.type === ConversationRoundStepType.toolCall);
    expect(toolSteps).toHaveLength(1);
    expect(toolSteps[0]).toMatchObject({
      tool_call_id: 'call-1',
      results: [{ type: 'error', message: 'The user chose not to proceed.' }],
    });
  });
});
