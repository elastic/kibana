/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  ConversationRoundStep,
  RoundModelUsageStats,
} from '@kbn/agent-builder-common';
import { ConversationRoundStatus, ConversationRoundStepType } from '@kbn/agent-builder-common';
import type { AskUserQuestionAnswer } from '@kbn/agent-builder-common/agents/prompts';
import { mergeRounds, applyResumeResolution } from './merge_rounds';

const usage = (llm_calls: number, input: number, output: number): RoundModelUsageStats => ({
  connector_id: 'connector-1',
  llm_calls,
  input_tokens: input,
  output_tokens: output,
});

const toolCallStep = (toolCallId: string, results: unknown[] = []): ConversationRoundStep =>
  ({
    type: ConversationRoundStepType.toolCall,
    tool_call_id: toolCallId,
    tool_id: 'my_tool',
    params: { q: 1 },
    results,
  } as unknown as ConversationRoundStep);

const askStep = (promptId: string, answers?: AskUserQuestionAnswer[]): ConversationRoundStep =>
  ({
    type: ConversationRoundStepType.askUserQuestion,
    prompt_id: promptId,
    questions: [
      { question: 'pick one', options: [{ label: 'a' }, { label: 'b' }], multi_select: false },
    ],
    ...(answers ? { answers } : {}),
  } as unknown as ConversationRoundStep);

const baseRound = (overrides: Partial<ConversationRound> = {}): ConversationRound => ({
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'hello' },
  steps: [],
  response: { message: 'done' },
  started_at: '2024-01-01T00:00:00.000Z',
  time_to_first_token: 10,
  time_to_last_token: 100,
  model_usage: usage(1, 5, 5),
  ...overrides,
});

describe('mergeRounds', () => {
  it('keeps the previous round identity and combines counters/steps', () => {
    const previous = baseRound({
      id: 'round-A',
      status: ConversationRoundStatus.awaitingPrompt,
      started_at: '2024-01-01T00:00:00.000Z',
      author: { id: 'u1', username: 'user1' },
      steps: [toolCallStep('call-1', [{ type: 'other', data: 'r1' }])],
      time_to_first_token: 10,
      time_to_last_token: 100,
      model_usage: usage(1, 5, 5),
      trace_id: 'trace-a',
      response: { message: '' },
    });
    const next = baseRound({
      id: 'round-B-should-be-dropped',
      status: ConversationRoundStatus.completed,
      started_at: '2024-01-01T00:05:00.000Z',
      steps: [toolCallStep('call-2', [{ type: 'other', data: 'r2' }])],
      time_to_first_token: 20,
      time_to_last_token: 200,
      model_usage: usage(2, 7, 9),
      trace_id: 'trace-b',
      response: { message: 'final' },
    });

    const merged = mergeRounds(previous, next);

    expect(merged.id).toBe('round-A');
    expect(merged.started_at).toBe('2024-01-01T00:00:00.000Z');
    expect(merged.author).toEqual({ id: 'u1', username: 'user1' });
    expect(merged.status).toBe(ConversationRoundStatus.completed);
    expect(merged.response).toEqual({ message: 'final' });
    expect(merged.steps).toHaveLength(2);
    expect(merged.time_to_first_token).toBe(30);
    expect(merged.time_to_last_token).toBe(300);
    expect(merged.model_usage).toMatchObject({ llm_calls: 3, input_tokens: 12, output_tokens: 14 });
    expect(merged.trace_id).toEqual(['trace-a', 'trace-b']);
    // state is left undefined for the caller to set.
    expect(merged.state).toBeUndefined();
  });
});

describe('applyResumeResolution', () => {
  it('answers a pending ask_user_question step from the answers map', () => {
    const previous = baseRound({
      status: ConversationRoundStatus.awaitingPrompt,
      steps: [askStep('prompt-1')],
      response: { message: '' },
    });
    const next = baseRound({
      steps: [toolCallStep('call-x', [{ type: 'other', data: 'ok' }])],
      response: { message: 'final answer' },
    });
    const answers = new Map<string, AskUserQuestionAnswer[]>([['prompt-1', [{ choice: [0] }]]]);

    const merged = applyResumeResolution(previous, next, answers);

    const ask = merged.steps.find((s) => s.type === ConversationRoundStepType.askUserQuestion);
    expect(ask).toMatchObject({ prompt_id: 'prompt-1', answers: [{ choice: [0] }] });
    // the follow-up's own tool call survives (non-pending id)
    expect(merged.steps.filter((s) => s.type === ConversationRoundStepType.toolCall)).toHaveLength(
      1
    );
    expect(merged.status).toBe(ConversationRoundStatus.completed);
  });

  it('resolves a pending tool call from the follow-up and does not duplicate it', () => {
    const previous = baseRound({
      status: ConversationRoundStatus.awaitingPrompt,
      steps: [toolCallStep('call-1', [])],
      response: { message: '' },
    });
    // exec_k carries the resolved copy of call-1 (leading) plus a genuine follow-up tool call.
    const next = baseRound({
      steps: [
        toolCallStep('call-1', [{ type: 'other', data: 'resolved' }]),
        toolCallStep('call-2', [{ type: 'other', data: 'new' }]),
      ],
      response: { message: 'final' },
    });

    const merged = applyResumeResolution(previous, next, new Map());

    const toolSteps = merged.steps.filter((s) => s.type === ConversationRoundStepType.toolCall);
    // call-1 (now resolved, in its original position) + call-2 (follow-up) — no duplicate call-1.
    expect(toolSteps).toHaveLength(2);
    const call1 = toolSteps.find(
      (s) => (s as { tool_call_id: string }).tool_call_id === 'call-1'
    ) as { results: unknown[] };
    expect(call1.results).toEqual([{ type: 'other', data: 'resolved' }]);
    expect(merged.steps[0]).toMatchObject({ tool_call_id: 'call-1' });
  });
});
