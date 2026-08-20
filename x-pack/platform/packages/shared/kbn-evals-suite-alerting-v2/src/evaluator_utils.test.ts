/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator, EvaluationResult, TaskOutput } from '@kbn/evals';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import {
  getAssistantMessages,
  getToolCallSteps,
  messagesFromRounds,
  requireNonEmptyStringList,
  withLowScoreLogging,
} from './evaluator_utils';

const createLog = () => ({ warning: jest.fn() } as unknown as ToolingLog);

const stubEvaluator = (result: EvaluationResult): Evaluator => ({
  name: 'Stub',
  kind: 'CODE',
  evaluate: jest.fn(async () => result),
});

const params = {
  input: { turns: ['I want to set up alerting.', 'I mean Alerting V2, CPU above 90%.'] },
  output: {
    rounds: [
      {
        input: { message: 'I want to set up alerting.' },
        response: { message: 'Do you want Alerting V2 or Security?' },
      },
      {
        input: { message: 'I mean Alerting V2, CPU above 90%.' },
        response: { message: "Here's how we'll build it..." },
      },
    ],
    messages: [
      { role: 'user', message: 'I want to set up alerting.' },
      { role: 'assistant', message: 'Do you want Alerting V2 or Security?' },
      { role: 'user', message: 'I mean Alerting V2, CPU above 90%.' },
      { role: 'assistant', message: "Here's how we'll build it..." },
    ],
    prompts: [
      {
        type: AgentPromptType.ask_user_question,
        id: 'ask-1',
        questions: [{ question: 'Which system?', options: [{ label: 'A' }], multi_select: false }],
      },
    ],
    traceId: 'trace-123',
  } as unknown as TaskOutput,
  expected: { criteria: ['stays on Alerting V2'] },
  metadata: {},
};

describe('messagesFromRounds', () => {
  it('projects user input and assistant response from each round', () => {
    expect(
      messagesFromRounds([
        {
          input: { message: 'first user' },
          response: { message: 'first assistant' },
        },
        {
          input: { message: 'second user' },
          response: { message: 'second assistant' },
        },
      ] as ConversationRound[])
    ).toEqual([
      { role: 'user', message: 'first user' },
      { role: 'assistant', message: 'first assistant' },
      { role: 'user', message: 'second user' },
      { role: 'assistant', message: 'second assistant' },
    ]);
  });
});

describe('getAssistantMessages', () => {
  it('returns assistant message text from the messages projection', () => {
    expect(
      getAssistantMessages({
        messages: [
          { role: 'user', message: 'u1' },
          { role: 'assistant', message: 'a1' },
          { role: 'user', message: 'u2' },
          { role: 'assistant', message: 'a2' },
        ],
      } as TaskOutput)
    ).toEqual(['a1', 'a2']);
  });
});

describe('getToolCallSteps', () => {
  it('returns only tool_call steps, preserving params and results', () => {
    expect(
      getToolCallSteps({
        steps: [
          { type: 'reasoning', tool_id: 'ignored' },
          {
            type: 'tool_call',
            tool_id: 'load_skill',
            params: { skill: 'rule-management' },
            results: [{ data: { skill: { id: 'rule-management' } } }],
          },
          { type: 'tool_call', tool_id: 'platform.core.list_indices', params: {} },
        ],
      } as TaskOutput)
    ).toEqual([
      {
        type: 'tool_call',
        tool_id: 'load_skill',
        params: { skill: 'rule-management' },
        results: [{ data: { skill: { id: 'rule-management' } } }],
      },
      { type: 'tool_call', tool_id: 'platform.core.list_indices', params: {} },
    ]);
  });
});

describe('requireNonEmptyStringList', () => {
  it('returns an empty array when the value is omitted', () => {
    expect(requireNonEmptyStringList(undefined, 'expectedSkills', 'skills')).toEqual([]);
  });

  it('returns the non-empty items when present', () => {
    expect(requireNonEmptyStringList(['a', '', 'b'], 'expectedToolIds', 'tool-ids')).toEqual([
      'a',
      'b',
    ]);
  });

  it('throws when the value is present but empty', () => {
    expect(() => requireNonEmptyStringList([], 'expectedToolIds', 'tool-ids')).toThrow(
      /expectedToolIds must be a non-empty array of tool-ids/i
    );
  });
});

describe('withLowScoreLogging', () => {
  it('logs a report when the score is below 1', async () => {
    const log = createLog();
    const evaluator = withLowScoreLogging(
      stubEvaluator({ score: 0, label: 'failed', explanation: 'did not disambiguate' }),
      log,
      { testTitle: 'observability use case routes to rule-management' }
    );

    const result = await evaluator.evaluate(params);

    expect(result.score).toBe(0);
    expect(log.warning).toHaveBeenCalledTimes(1);
    const message = (log.warning as jest.Mock).mock.calls[0][0] as string;
    expect(message).toContain('LOW SCORE: Stub = 0');
    expect(message).toContain('did not disambiguate');
    expect(message).toContain('observability use case routes to rule-management');
    expect(message).toContain('trace-123');
    expect(message).toContain('[user] I want to set up alerting.');
    expect(message).toContain('[assistant] Do you want Alerting V2 or Security?');
    expect(message).toContain('Prompts');
  });

  it('logs for a partial (fractional) score', async () => {
    const log = createLog();
    const evaluator = withLowScoreLogging(stubEvaluator({ score: 0.67 }), log);

    await evaluator.evaluate(params);

    expect(log.warning).toHaveBeenCalledTimes(1);
    expect((log.warning as jest.Mock).mock.calls[0][0]).toContain('LOW SCORE: Stub = 0.67');
  });

  it('does not log when the score is exactly 1', async () => {
    const log = createLog();
    const evaluator = withLowScoreLogging(stubEvaluator({ score: 1 }), log);

    await evaluator.evaluate(params);

    expect(log.warning).not.toHaveBeenCalled();
  });

  it('does not log when the score is null (skipped/unavailable)', async () => {
    const log = createLog();
    const evaluator = withLowScoreLogging(stubEvaluator({ score: null, label: 'skipped' }), log);

    await evaluator.evaluate(params);

    expect(log.warning).not.toHaveBeenCalled();
  });

  it('passes the evaluator result through unchanged and preserves name/kind', async () => {
    const log = createLog();
    const underlying = stubEvaluator({ score: 0.5, metadata: { foo: 'bar' } });
    const evaluator = withLowScoreLogging(underlying, log);

    expect(evaluator.name).toBe('Stub');
    expect(evaluator.kind).toBe('CODE');

    const result = await evaluator.evaluate(params);
    expect(result).toEqual({ score: 0.5, metadata: { foo: 'bar' } });
    expect(underlying.evaluate).toHaveBeenCalledWith(params);
  });
});
