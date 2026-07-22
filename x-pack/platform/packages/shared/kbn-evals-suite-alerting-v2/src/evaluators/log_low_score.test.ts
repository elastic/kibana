/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator, EvaluationResult, TaskOutput } from '@kbn/evals';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import { withLowScoreLogging } from './log_low_score';

const createLog = () => ({ warning: jest.fn() } as unknown as ToolingLog);

const stubEvaluator = (result: EvaluationResult): Evaluator => ({
  name: 'Stub',
  kind: 'CODE',
  evaluate: jest.fn(async () => result),
});

const params = {
  input: { turns: ['I want to set up alerting.', 'I mean Alerting V2, CPU above 90%.'] },
  output: {
    messages: [
      { message: 'I want to set up alerting.' },
      { message: 'Do you want Alerting V2 or Security?' },
      { message: 'I mean Alerting V2, CPU above 90%.' },
      { message: "Here's how we'll build it..." },
    ],
    openerPrompts: [
      {
        type: AgentPromptType.ask_user_question,
        id: 'ask-1',
        questions: [{ question: 'Which system?', options: [{ label: 'A' }], multi_select: false }],
      },
    ],
    traceId: 'trace-123',
  } as unknown as TaskOutput,
  expected: { criteria: ['stays on Alerting V2'] },
  metadata: { query_intent: 'multi-turn clarification' },
};

describe('withLowScoreLogging', () => {
  it('logs a report when the score is below 1', async () => {
    const log = createLog();
    const evaluator = withLowScoreLogging(
      stubEvaluator({ score: 0, label: 'failed', explanation: 'did not disambiguate' }),
      log
    );

    const result = await evaluator.evaluate(params);

    expect(result.score).toBe(0);
    expect(log.warning).toHaveBeenCalledTimes(1);
    const message = (log.warning as jest.Mock).mock.calls[0][0] as string;
    expect(message).toContain('LOW SCORE: Stub = 0');
    expect(message).toContain('did not disambiguate');
    expect(message).toContain('multi-turn clarification');
    expect(message).toContain('trace-123');
    expect(message).toContain('[user] I want to set up alerting.');
    expect(message).toContain('[assistant] Do you want Alerting V2 or Security?');
    expect(message).toContain('Opener prompts');
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
