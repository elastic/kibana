/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  ConversationRoundStepType,
  ToolResultType,
  TimelineEventType,
  EventActorType,
  TimelineTriggerType,
  isCompactionStep,
  isToolCallStep,
  findTodosStep,
  type ChatEvent,
  type TodoItem,
  type ExecutionTerminatedEvent,
  type PromptResponseEvent,
} from '@kbn/agent-builder-common';
import type { ToolResult } from '@kbn/agent-builder-common/tools';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { ActiveExecutionDraft } from './active_execution_reducer';
import { activeExecutionReducer, withPromptResponse } from './active_execution_reducer';

// --------------- minimal event factories ---------------

const reasoningEvent = (reasoning: string, transient?: boolean): ChatEvent =>
  ({
    type: ChatEventType.reasoning,
    data: { reasoning, transient },
  } as ChatEvent);

const messageChunkEvent = (text_chunk: string): ChatEvent =>
  ({
    type: ChatEventType.messageChunk,
    data: { message_id: 'm1', text_chunk },
  } as ChatEvent);

const messageCompleteEvent = (message_content: string): ChatEvent =>
  ({
    type: ChatEventType.messageComplete,
    data: { message_id: 'm1', message_content },
  } as ChatEvent);

const thinkingCompleteEvent = (time_to_first_token: number): ChatEvent =>
  ({
    type: ChatEventType.thinkingComplete,
    data: { time_to_first_token },
  } as ChatEvent);

const toolCallEvent = (tool_call_id: string, tool_id: string): ChatEvent =>
  ({
    type: ChatEventType.toolCall,
    data: { tool_call_id, tool_id, params: {} },
  } as ChatEvent);

const toolProgressEvent = (tool_call_id: string, message: string): ChatEvent =>
  ({
    type: ChatEventType.toolProgress,
    data: { tool_call_id, message },
  } as ChatEvent);

const toolResultEvent = (tool_call_id: string, results: ToolResult[]): ChatEvent =>
  ({
    type: ChatEventType.toolResult,
    data: { tool_call_id, tool_id: 'some_tool', results },
  } as ChatEvent);

const toolResult = (content: string): ToolResult => ({
  tool_result_id: `tr-${content}`,
  type: ToolResultType.other,
  data: { content },
});

const promptRequestEvent = (): ChatEvent =>
  ({
    type: ChatEventType.promptRequest,
    data: {
      prompt: { type: AgentPromptType.confirmation, id: 'p1' },
      source: { type: 'tool_call', tool_call_id: 'tc1' },
    },
  } as ChatEvent);

const compactionStartedEvent = (token_count_before: number): ChatEvent =>
  ({
    type: ChatEventType.compactionStarted,
    data: { token_count_before },
  } as ChatEvent);

const compactionCompletedEvent = (
  token_count_after: number,
  summarized_round_count: number
): ChatEvent =>
  ({
    type: ChatEventType.compactionCompleted,
    data: { token_count_after, summarized_round_count },
  } as ChatEvent);

const todosUpdatedEvent = (todos: TodoItem[]): ChatEvent =>
  ({
    type: ChatEventType.toolUi,
    data: {
      tool_id: 'todos',
      tool_call_id: 'tc-todos',
      custom_event: 'todos_updated',
      data: { todos },
    },
  } as ChatEvent);

const roundCompleteEvent = (round_id: string): ChatEvent =>
  ({
    type: ChatEventType.roundComplete,
    data: { round: { id: round_id, steps: [], status: 'completed' } },
  } as unknown as ChatEvent);

const unknownEvent = (): ChatEvent =>
  ({
    type: 'unknown_event_type_xyz',
    data: {},
  } as any as ChatEvent);

const executionStartedEvent = (
  execution_id = 'exec-1',
  created_at = '2026-01-01T00:00:00.000Z',
  trigger_event_id?: string
): ChatEvent =>
  ({
    type: TimelineEventType.executionStarted,
    id: `${execution_id}::execution_started`,
    created_at,
    actor: { type: EventActorType.agent, id: 'agent' },
    execution_id,
    ...(trigger_event_id ? { trigger_event_id } : {}),
    data: { trigger_type: TimelineTriggerType.userMessage },
  } as ChatEvent);

const executionTerminatedEvent = (
  execution_id = 'exec-1',
  created_at = '2026-01-01T00:01:00.000Z'
): ExecutionTerminatedEvent => ({
  type: TimelineEventType.executionTerminated,
  id: `${execution_id}::execution_terminated`,
  created_at,
  actor: { type: EventActorType.agent, id: 'agent' },
  execution_id,
  data: {
    model_usage: {
      connector_id: '',
      llm_calls: 1,
      input_tokens: 10,
      output_tokens: 5,
      model: 'test',
    },
    time_to_first_token: 100,
    time_to_last_token: 200,
    outcome: { type: 'responded', response: { message: 'done' } },
  },
});

const promptRequestedTerminatedEvent = (
  prompts: Array<{ type: AgentPromptType; id: string }>,
  execution_id = 'exec-1'
): ExecutionTerminatedEvent => {
  const base = executionTerminatedEvent(execution_id);
  return {
    ...base,
    data: { ...base.data, outcome: { type: 'prompt_requested', prompts } as any },
  };
};

// -------------------------------------------------------

describe('activeExecutionReducer', () => {
  it('creates an active execution from empty on first event', () => {
    const state = activeExecutionReducer(null, messageChunkEvent('hello'));
    expect(state).not.toBeNull();
    expect(state?.status).toBe('running');
    expect(state?.message).toBe('hello');
  });

  it('ignores transient reasoning without creating a draft', () => {
    expect(activeExecutionReducer(null, reasoningEvent('thinking...', true))).toBeNull();
  });

  it.each(['running', 'awaiting_prompt', 'completed'] as const)(
    'ignores transient reasoning without changing a %s execution',
    (status) => {
      const state = { status, steps: [], message: 'Existing response' };
      expect(activeExecutionReducer(state, reasoningEvent('thinking...', true))).toBe(state);
    }
  );

  it('non-transient reasoning appends a reasoning step and resets message', () => {
    const s1 = activeExecutionReducer(null, messageChunkEvent('prior'));
    const s2 = activeExecutionReducer(s1, reasoningEvent('real reasoning'));

    expect(s2?.steps).toHaveLength(1);
    expect(s2?.steps[0].type).toBe(ConversationRoundStepType.reasoning);
    expect(s2?.message).toBe('');
  });

  it('message_chunk appends text_chunk to message; two chunks concatenate', () => {
    const s1 = activeExecutionReducer(null, messageChunkEvent('Hello '));
    const s2 = activeExecutionReducer(s1, messageChunkEvent('world'));

    expect(s2?.message).toBe('Hello world');
  });

  it('message_complete replaces message with message_content', () => {
    const s1 = activeExecutionReducer(null, messageChunkEvent('partial'));
    const s2 = activeExecutionReducer(s1, messageCompleteEvent('full message'));
    expect(s2?.message).toBe('full message');
  });

  it('thinking_complete sets timeToFirstToken', () => {
    const state = activeExecutionReducer(null, thinkingCompleteEvent(420));
    expect(state?.timeToFirstToken).toBe(420);
  });

  it('tool_call appends a tool call step with correct tool_call_id and tool_id', () => {
    const state = activeExecutionReducer(null, toolCallEvent('tc-1', 'my_tool'));
    const steps = state?.steps ?? [];
    expect(steps).toHaveLength(1);
    const [step] = steps;
    expect(isToolCallStep(step)).toBe(true);
    if (!isToolCallStep(step)) return;
    expect(step.tool_call_id).toBe('tc-1');
    expect(step.tool_id).toBe('my_tool');
  });

  it('tool_progress appends to matching tool-call step progression; unmatched id is a no-op', () => {
    const s1 = activeExecutionReducer(null, toolCallEvent('tc-1', 'my_tool'));
    const s2 = activeExecutionReducer(s1, toolProgressEvent('tc-1', 'step 1'));
    const s3 = activeExecutionReducer(s2, toolProgressEvent('tc-99', 'orphan'));

    const step = s2?.steps[0];
    if (!step || !isToolCallStep(step)) throw new Error('expected a tool call step');
    expect(step.progression).toHaveLength(1);
    expect(step.progression?.[0].message).toBe('step 1');

    // unmatched progress - steps unchanged
    expect(s3?.steps[0]).toEqual(s2?.steps[0]);
  });

  it('tool_result sets results on the matching tool-call step', () => {
    const s1 = activeExecutionReducer(null, toolCallEvent('tc-1', 'my_tool'));
    const results = [toolResult('ok')];
    const s2 = activeExecutionReducer(s1, toolResultEvent('tc-1', results));

    const step = s2?.steps[0];
    if (!step || !isToolCallStep(step)) throw new Error('expected a tool call step');
    expect(step.results).toEqual(results);
  });

  it('prompt_request sets status to awaiting_prompt and appends to pendingPrompts', () => {
    const state = activeExecutionReducer(null, promptRequestEvent());
    expect(state?.status).toBe('awaiting_prompt');
    expect(state?.pendingPrompts).toHaveLength(1);
    expect(state?.pendingPrompts?.[0].id).toBe('p1');
  });

  it('execution_terminated overwrites the streamed preview from its outcome.prompts', () => {
    const s1 = activeExecutionReducer(null, promptRequestEvent());
    expect(s1?.pendingPrompts?.[0].id).toBe('p1');

    const terminal = promptRequestedTerminatedEvent([
      { type: AgentPromptType.confirmation, id: 'authoritative' },
    ]);
    const sealed = activeExecutionReducer(s1, terminal);

    expect(sealed?.pendingPrompts).toHaveLength(1);
    expect(sealed?.pendingPrompts?.[0].id).toBe('authoritative');
    expect(sealed?.terminalEvent).toBe(terminal);
  });

  it('a non-prompt terminal clears the streamed pending prompts', () => {
    const s1 = activeExecutionReducer(null, promptRequestEvent());
    expect(s1?.pendingPrompts).toHaveLength(1);

    const sealed = activeExecutionReducer(s1, executionTerminatedEvent('exec-1'));

    expect(sealed?.pendingPrompts).toBeUndefined();
  });

  it('compaction_started then compaction_completed creates one compaction step patched with token_count_after and summarized_round_count', () => {
    const s1 = activeExecutionReducer(null, compactionStartedEvent(1000));
    expect(s1?.steps).toHaveLength(1);
    const started = s1?.steps[0];
    if (!started || !isCompactionStep(started)) throw new Error('expected a compaction step');
    expect(started.token_count_before).toBe(1000);
    expect(started.token_count_after).toBe(0);

    const s2 = activeExecutionReducer(s1, compactionCompletedEvent(500, 3));
    expect(s2?.steps).toHaveLength(1);
    const completed = s2?.steps[0];
    if (!completed || !isCompactionStep(completed)) throw new Error('expected a compaction step');
    expect(completed.token_count_after).toBe(500);
    expect(completed.summarized_round_count).toBe(3);
  });

  it('todos_updated adds a todos step first time; patches same step on second call (not a second step)', () => {
    const todos1: TodoItem[] = [{ content: 'first', status: 'pending' }];
    const todos2: TodoItem[] = [{ content: 'second', status: 'in_progress' }];

    const s1 = activeExecutionReducer(null, todosUpdatedEvent(todos1));
    expect(s1?.steps).toHaveLength(1);
    expect(s1?.steps[0].type).toBe(ConversationRoundStepType.updateTodos);

    const s2 = activeExecutionReducer(s1, todosUpdatedEvent(todos2));
    expect(s2?.steps).toHaveLength(1);
    expect(findTodosStep(s2?.steps ?? [])?.todos).toEqual(todos2);
  });

  it('round_complete is ignored - it belongs to the rounds path, not the events timeline', () => {
    const s1 = activeExecutionReducer(null, messageCompleteEvent('hello world'));

    const s2 = activeExecutionReducer(s1, roundCompleteEvent('round-42'));

    expect(s2).toBe(s1); // same reference - no mutation
  });

  it('an event arriving on a draft paused on a HITL prompt appends to that draft', () => {
    const s1 = activeExecutionReducer(null, messageChunkEvent('partial'));
    const s2 = activeExecutionReducer(s1, promptRequestEvent());
    expect(s2?.status).toBe('awaiting_prompt');

    const s3 = activeExecutionReducer(s2, toolCallEvent('tc-resume', 'some_tool'));

    expect(s3?.status).toBe('awaiting_prompt');
    expect(s3?.message).toBe('partial');
    expect(s3?.steps).toHaveLength(1);
  });

  it('unhandled event returns state unchanged and does not create a draft', () => {
    const s1 = activeExecutionReducer(null, unknownEvent());

    expect(s1).toBeNull();
  });

  it('execution_started sets executionId and startedAt on the draft', () => {
    const state = activeExecutionReducer(
      null,
      executionStartedEvent('exec-42', '2026-06-01T10:00:00.000Z')
    );
    expect(state?.executionId).toBe('exec-42');
    expect(state?.startedAt).toBe('2026-06-01T10:00:00.000Z');
    expect(state?.status).toBe('running');
  });

  it('execution_started records the trigger event id', () => {
    const state = activeExecutionReducer(
      null,
      executionStartedEvent('exec-42', '2026-06-01T10:00:00.000Z', 'round-42::user_message')
    );
    expect(state?.triggerEventId).toBe('round-42::user_message');
  });

  it('execution_terminated falls back to its trigger_event_id when execution_started did not set one', () => {
    const terminal = {
      ...executionTerminatedEvent('exec-42'),
      trigger_event_id: 'round-42::user_message',
    };
    const state = activeExecutionReducer(null, terminal);
    expect(state?.triggerEventId).toBe('round-42::user_message');

    const started = activeExecutionReducer(
      null,
      executionStartedEvent('exec-42', '2026-06-01T10:00:00.000Z', 'from-start')
    );
    expect(activeExecutionReducer(started, terminal)?.triggerEventId).toBe('from-start');
  });

  it('execution_terminated seals the draft: status completed, terminalEvent stored', () => {
    const s1 = activeExecutionReducer(null, executionStartedEvent('exec-seal'));
    const terminal = executionTerminatedEvent('exec-seal');
    const s3 = activeExecutionReducer(s1, terminal);

    expect(s3?.status).toBe('completed');
    expect(s3?.terminalEvent).toBe(terminal);
    expect(s3?.executionId).toBe('exec-seal');
  });

  it('execution_terminated falls back to event execution_id/created_at when not set by execution_started', () => {
    const terminal = executionTerminatedEvent('exec-fallback', '2026-06-01T11:00:00.000Z');
    const state = activeExecutionReducer(null, terminal);

    expect(state?.status).toBe('completed');
    expect(state?.executionId).toBe('exec-fallback');
    expect(state?.startedAt).toBe('2026-06-01T11:00:00.000Z');
  });

  it('an event arriving after seal starts a fresh draft, discarding the sealed state', () => {
    const terminal = executionTerminatedEvent('exec-old');
    const sealed = activeExecutionReducer(null, terminal);
    expect(sealed?.status).toBe('completed');

    const fresh = activeExecutionReducer(sealed, messageChunkEvent('new run'));
    expect(fresh?.status).toBe('running');
    expect(fresh?.message).toBe('new run');
    expect(fresh?.executionId).toBeUndefined();
    expect(fresh?.terminalEvent).toBeUndefined();
  });

  it('execution_started after seal resets and annotates the new draft', () => {
    const terminal = executionTerminatedEvent('exec-old');
    const sealed = activeExecutionReducer(null, terminal);

    const fresh = activeExecutionReducer(
      sealed,
      executionStartedEvent('exec-new', '2026-06-01T12:00:00.000Z')
    );
    expect(fresh?.status).toBe('running');
    expect(fresh?.executionId).toBe('exec-new');
    expect(fresh?.terminalEvent).toBeUndefined();
  });

  it('happy-path sequence: reasoning → tool_call → tool_result → message_chunk → message_complete accumulates correctly', () => {
    let state: ActiveExecutionDraft | null = null;

    state = activeExecutionReducer(state, reasoningEvent('thinking'));
    state = activeExecutionReducer(state, toolCallEvent('tc-1', 'search'));
    const results = [toolResult('results')];
    state = activeExecutionReducer(state, toolResultEvent('tc-1', results));
    state = activeExecutionReducer(state, messageChunkEvent('answer '));
    state = activeExecutionReducer(state, messageChunkEvent('here'));
    state = activeExecutionReducer(state, messageCompleteEvent('answer here'));

    expect(state?.status).toBe('running');
    expect(state?.message).toBe('answer here');

    const steps = state?.steps ?? [];
    expect(steps).toHaveLength(2); // reasoning step + tool_call step
    expect(steps[0].type).toBe(ConversationRoundStepType.reasoning);
    expect(steps[1].type).toBe(ConversationRoundStepType.toolCall);
    const toolCall = steps[1];
    if (!isToolCallStep(toolCall)) throw new Error('expected a tool call step');
    expect(toolCall.results).toEqual(results);
  });
});

describe('activeExecutionReducer - ask_user_question', () => {
  const questions = [
    {
      question: 'Which environment?',
      options: [{ label: 'Prod' }, { label: 'Dev' }],
      multi_select: false,
    },
  ];
  const askPromptRequestEvent = (): ChatEvent =>
    ({
      type: ChatEventType.promptRequest,
      data: {
        prompt: { type: AgentPromptType.ask_user_question, id: 'prompt-1', questions },
        source: { type: 'tool_call', tool_call_id: 'tc1' },
      },
    } as ChatEvent);

  it('an ask_user_question prompt_request appends the step and the pending prompt', () => {
    const state = activeExecutionReducer(null, askPromptRequestEvent());

    expect(state?.status).toBe('awaiting_prompt');
    expect(state?.pendingPrompts).toHaveLength(1);
    expect(state?.steps).toEqual([
      { type: ConversationRoundStepType.askUserQuestion, prompt_id: 'prompt-1', questions },
    ]);
  });

  it('a confirmation prompt_request creates a pending prompt but no step', () => {
    const state = activeExecutionReducer(null, promptRequestEvent());

    expect(state?.pendingPrompts).toHaveLength(1);
    expect(state?.steps).toHaveLength(0);
  });
});

describe('withPromptResponse', () => {
  const promptResponse: PromptResponseEvent = {
    id: 'pending::prompt_response',
    type: TimelineEventType.promptResponse,
    created_at: '2026-06-01T10:00:00.000Z',
    actor: { type: EventActorType.user, id: '' },
    data: {
      prompt_requested_event_id: 'exec-paused::execution_terminated',
      responses: { 'prompt-1': { allow: true } },
    },
  };

  it('records the answer on a sealed pause draft without disturbing it', () => {
    const sealed = activeExecutionReducer(null, executionTerminatedEvent('exec-paused'));

    const answered = withPromptResponse(sealed, promptResponse);

    expect(answered.status).toBe('completed');
    expect(answered.terminalEvent).toBe(sealed?.terminalEvent);
    expect(answered.promptResponse).toBe(promptResponse);
  });

  it('records the answer even when no draft is live', () => {
    const answered = withPromptResponse(null, promptResponse);

    expect(answered.status).toBe('running');
    expect(answered.steps).toEqual([]);
    expect(answered.promptResponse).toBe(promptResponse);
  });

  it('keeps the recorded answer when the resume execution resets the draft', () => {
    const sealed = activeExecutionReducer(null, executionTerminatedEvent('exec-paused'));
    const answered = withPromptResponse(sealed, promptResponse);

    const resumed = activeExecutionReducer(
      answered,
      executionStartedEvent('exec-resume', '2026-06-01T10:00:01.000Z')
    );

    expect(resumed?.status).toBe('running');
    expect(resumed?.executionId).toBe('exec-resume');
    expect(resumed?.terminalEvent).toBeUndefined();
    expect(resumed?.promptResponse).toBe(promptResponse);
  });
});
