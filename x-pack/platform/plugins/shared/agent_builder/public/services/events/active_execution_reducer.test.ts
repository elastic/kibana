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
  isCompactionStep,
  isToolCallStep,
  findTodosStep,
  type ChatEvent,
  type TodoItem,
} from '@kbn/agent-builder-common';
import type { ToolResult } from '@kbn/agent-builder-common/tools';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { ActiveExecutionDraft } from './active_execution_reducer';
import { activeExecutionReducer } from './active_execution_reducer';

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

// -------------------------------------------------------

describe('activeExecutionReducer', () => {
  it('creates an active execution from empty on first event', () => {
    const state = activeExecutionReducer(null, messageChunkEvent('hello'));
    expect(state).not.toBeNull();
    expect(state?.status).toBe('running');
    expect(state?.message).toBe('hello');
  });

  it('reasoning transient=true sets transientReasoning, adds NO step', () => {
    const state = activeExecutionReducer(null, reasoningEvent('thinking...', true));
    expect(state?.transientReasoning).toBe('thinking...');
    expect(state?.steps).toHaveLength(0);
  });

  it('reasoning non-transient appends a reasoning step, resets message and clears transientReasoning', () => {
    const s1 = activeExecutionReducer(null, messageChunkEvent('prior'));
    const s2 = activeExecutionReducer(s1, reasoningEvent('thinking...', true));
    const s3 = activeExecutionReducer(s2, reasoningEvent('real reasoning'));

    expect(s3?.steps).toHaveLength(1);
    expect(s3?.steps[0].type).toBe(ConversationRoundStepType.reasoning);
    expect(s3?.message).toBe('');
    expect(s3?.transientReasoning).toBeUndefined();
  });

  it('message_chunk appends text_chunk to message and clears transientReasoning; two chunks concatenate', () => {
    const s1 = activeExecutionReducer(null, reasoningEvent('tr', true));
    const s2 = activeExecutionReducer(s1, messageChunkEvent('Hello '));
    const s3 = activeExecutionReducer(s2, messageChunkEvent('world'));

    expect(s2?.transientReasoning).toBeUndefined();
    expect(s3?.message).toBe('Hello world');
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
