/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConnectorModelUsageStats,
  ConversationRound,
  ConversationRoundStep,
  PreExecutionWorkflowStep,
  RoundModelUsageStats,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  ZERO_MODEL_USAGE,
} from '@kbn/agent-builder-common';
import type { AskUserQuestionAnswer } from '@kbn/agent-builder-common/agents/prompts';
import { mergeRounds, mergeModelUsage, applyResumeResolution } from './merge_rounds';

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

describe('mergeRounds — last call input tokens', () => {
  it("keeps the resume's last call, else the previous round's", () => {
    const previous = baseRound({
      model_usage: { ...usage(1, 5, 5), last_call_input_tokens: 5 },
    });

    expect(
      mergeRounds(
        previous,
        baseRound({ model_usage: { ...usage(1, 9, 5), last_call_input_tokens: 9 } })
      ).model_usage.last_call_input_tokens
    ).toBe(9);
    expect(
      mergeRounds(previous, baseRound({ model_usage: usage(1, 9, 5) })).model_usage
        .last_call_input_tokens
    ).toBe(5);
  });
});

describe('mergeModelUsage — per-connector breakdown', () => {
  const connectorUsage = (
    connector_id: string,
    llm_calls: number,
    input_tokens: number,
    output_tokens: number,
    extra: Partial<ConnectorModelUsageStats> = {}
  ): ConnectorModelUsageStats => ({
    connector_id,
    llm_calls,
    input_tokens,
    output_tokens,
    ...extra,
  });

  const withConnectors = (
    connectors: ConnectorModelUsageStats[],
    extra: Partial<RoundModelUsageStats> = {}
  ): RoundModelUsageStats => ({
    connector_id: connectors[0].connector_id,
    llm_calls: connectors.reduce((total, c) => total + c.llm_calls, 0),
    input_tokens: connectors.reduce((total, c) => total + c.input_tokens, 0),
    output_tokens: connectors.reduce((total, c) => total + c.output_tokens, 0),
    connectors,
    ...extra,
  });

  it('merges the entries by connector id: the first side first, then the entries only in the second', () => {
    const a = withConnectors([
      connectorUsage('main', 2, 100, 10),
      connectorUsage('fast', 1, 10, 1),
    ]);
    const b = withConnectors([connectorUsage('other', 1, 20, 2), connectorUsage('main', 1, 50, 5)]);

    const merged = mergeModelUsage(a, b);

    expect(merged.connectors).toEqual([
      connectorUsage('main', 3, 150, 15),
      connectorUsage('fast', 1, 10, 1),
      connectorUsage('other', 1, 20, 2),
    ]);
    expect(merged).toMatchObject({ llm_calls: 5, input_tokens: 180, output_tokens: 18 });
  });

  it('sums the cached tokens when either side reports them, and keeps the first model', () => {
    const a = withConnectors([
      connectorUsage('main', 1, 100, 10, { cached_input_tokens: 60, model: 'opus' }),
      connectorUsage('fast', 1, 10, 1),
      connectorUsage('other', 1, 10, 1),
    ]);
    const b = withConnectors([
      connectorUsage('main', 1, 100, 10, { cached_input_tokens: 40, model: 'opus-later' }),
      connectorUsage('fast', 1, 10, 1, { cached_input_tokens: 5, model: 'haiku' }),
      connectorUsage('other', 1, 10, 1),
    ]);

    const merged = mergeModelUsage(a, b);

    expect(merged.connectors).toEqual([
      connectorUsage('main', 2, 200, 20, { cached_input_tokens: 100, model: 'opus' }),
      connectorUsage('fast', 2, 20, 2, { cached_input_tokens: 5, model: 'haiku' }),
      connectorUsage('other', 2, 20, 2),
    ]);
  });

  it('sums the reasoning tokens of each connector when either side reports them', () => {
    const a = withConnectors([
      connectorUsage('main', 1, 100, 20, { reasoning_tokens: 10 }),
      connectorUsage('fast', 1, 10, 2),
      connectorUsage('other', 1, 10, 2),
    ]);
    const b = withConnectors([
      connectorUsage('main', 1, 100, 20, { reasoning_tokens: 5 }),
      connectorUsage('fast', 1, 10, 2, { reasoning_tokens: 3 }),
      connectorUsage('other', 1, 10, 2),
    ]);

    const merged = mergeModelUsage(a, b);

    expect(merged.connectors?.map((connector) => connector.reasoning_tokens)).toEqual([
      15,
      3,
      undefined,
    ]);
    // a connector that never reported them has no field, not a zero
    expect(merged.connectors?.[2]).not.toHaveProperty('reasoning_tokens');
  });

  it('sums the top-level reasoning tokens when either side reports them', () => {
    const connectors = [connectorUsage('main', 1, 100, 20)];
    const reported = (reasoningTokens?: number) =>
      withConnectors(
        connectors,
        reasoningTokens === undefined ? {} : { reasoning_tokens: reasoningTokens }
      );

    expect(mergeModelUsage(reported(10), reported(5)).reasoning_tokens).toBe(15);
    expect(mergeModelUsage(reported(10), reported()).reasoning_tokens).toBe(10);
    expect(mergeModelUsage(reported(), reported(5)).reasoning_tokens).toBe(5);
    expect(mergeModelUsage(reported(0), reported()).reasoning_tokens).toBe(0);
    expect(mergeModelUsage(reported(), reported())).not.toHaveProperty('reasoning_tokens');
  });

  it('keeps the reasoning tokens of the merged usage when the breakdown is dropped', () => {
    const withBreakdown = withConnectors([connectorUsage('main', 1, 100, 20)], {
      reasoning_tokens: 10,
    });
    const legacy = { ...usage(1, 5, 5), reasoning_tokens: 4 };

    const merged = mergeModelUsage(legacy, withBreakdown);

    expect(merged).not.toHaveProperty('connectors');
    expect(merged.reasoning_tokens).toBe(14);
  });

  it('drops the breakdown when a side made calls but has none (persisted before it existed)', () => {
    const withBreakdown = withConnectors([connectorUsage('main', 1, 100, 10)]);
    const legacy = usage(1, 5, 5);

    expect(mergeModelUsage(legacy, withBreakdown)).not.toHaveProperty('connectors');
    expect(mergeModelUsage(withBreakdown, legacy)).not.toHaveProperty('connectors');
    expect(mergeModelUsage(legacy, legacy)).not.toHaveProperty('connectors');
    expect(mergeModelUsage(legacy, withBreakdown)).toMatchObject({
      llm_calls: 2,
      input_tokens: 105,
      output_tokens: 15,
    });
  });

  it('keeps the breakdown of the other side when a side made no call', () => {
    const withBreakdown = withConnectors([connectorUsage('main', 1, 100, 10)]);
    const noCall = { ...usage(0, 0, 0), llm_calls: 0 };

    expect(mergeModelUsage(noCall, withBreakdown).connectors).toEqual(withBreakdown.connectors);
    expect(mergeModelUsage(withBreakdown, noCall).connectors).toEqual(withBreakdown.connectors);
  });

  it('has no breakdown when neither side made a call', () => {
    expect(mergeModelUsage(usage(0, 0, 0), usage(0, 0, 0))).not.toHaveProperty('connectors');
  });

  it('does not mutate its inputs', () => {
    const a = withConnectors([connectorUsage('main', 1, 100, 10)]);
    const b = withConnectors([connectorUsage('main', 1, 50, 5)]);

    mergeModelUsage(a, b);

    expect(a.connectors).toEqual([connectorUsage('main', 1, 100, 10)]);
    expect(b.connectors).toEqual([connectorUsage('main', 1, 50, 5)]);
  });
});

describe('applyResumeResolution', () => {
  it('retains exactly the initial pre-execution workflow step after an HITL fold', () => {
    const workflowStep: PreExecutionWorkflowStep = {
      type: ConversationRoundStepType.preExecutionWorkflow,
      model_context: '<system_update>original context</system_update>',
      workflow_context: {
        'nightshift.semantic_memory.recall': {
          version: 1,
          data: { recalled_ids: ['memory-original'] },
        },
      },
    };
    const previous = baseRound({
      status: ConversationRoundStatus.awaitingPrompt,
      input: { message: 'original request' },
      steps: [workflowStep],
      response: { message: '' },
    });
    const next = baseRound({
      input: { message: '' },
      response: { message: 'final answer' },
    });

    const merged = applyResumeResolution(previous, next, new Map());

    expect(merged.input).toEqual(previous.input);
    expect(
      merged.steps.filter((step) => step.type === ConversationRoundStepType.preExecutionWorkflow)
    ).toEqual([workflowStep]);
  });

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

describe('mergeRounds — interruption and defaults', () => {
  it('carries interruption from next and sums the interrupted partial defaults without NaN', () => {
    const previous = baseRound({ id: 'r', time_to_first_token: 7, time_to_last_token: 10 });
    const next = baseRound({
      id: 'r',
      time_to_first_token: 0,
      time_to_last_token: 3,
      model_usage: ZERO_MODEL_USAGE,
      response: { message: '' },
      interruption: { type: 'aborted' },
    });
    const merged = mergeRounds(previous, next);
    expect(merged.interruption).toEqual({ type: 'aborted' });
    expect(merged.time_to_first_token).toBe(7);
    expect(merged.time_to_last_token).toBe(13);
    expect(merged.model_usage.connector_id).toBe(previous.model_usage.connector_id);
  });

  it('clears interruption when next is a terminated partial', () => {
    const previous = baseRound({ id: 'r', interruption: { type: 'aborted' } });
    const merged = mergeRounds(previous, baseRound({ id: 'r' }));
    expect(merged.interruption).toBeUndefined();
  });
});

describe('applyResumeResolution — interrupted copies', () => {
  it('carries the interrupted mark from the resolved copy onto the inherited pending call', () => {
    const previous = baseRound({ id: 'r', steps: [toolCallStep('tc1', [])] });
    const next = baseRound({
      id: 'r',
      steps: [{ ...toolCallStep('tc1', []), interrupted: true } as ConversationRoundStep],
    });
    const merged = applyResumeResolution(previous, next, new Map());
    expect(merged.steps).toHaveLength(1);
    expect((merged.steps[0] as { interrupted?: true }).interrupted).toBe(true);
  });

  it('clears an inherited mark when the resolving copy is unmarked (failed resume, then a successful retry)', () => {
    const previous = baseRound({
      id: 'r',
      steps: [{ ...toolCallStep('tc1', []), interrupted: true } as ConversationRoundStep],
    });
    const next = baseRound({ id: 'r', steps: [toolCallStep('tc1', [{ ok: true }])] });
    const merged = applyResumeResolution(previous, next, new Map());
    expect(merged.steps).toHaveLength(1);
    expect(merged.steps[0]).not.toHaveProperty('interrupted');
    expect((merged.steps[0] as { results: unknown[] }).results).toEqual([{ ok: true }]);
  });

  it('does not mark when the copy is an unmarked empty return', () => {
    const previous = baseRound({ id: 'r', steps: [toolCallStep('tc1', [])] });
    const next = baseRound({ id: 'r', steps: [toolCallStep('tc1', [])] });
    const merged = applyResumeResolution(previous, next, new Map());
    expect((merged.steps[0] as { interrupted?: true }).interrupted).toBeUndefined();
  });
});
