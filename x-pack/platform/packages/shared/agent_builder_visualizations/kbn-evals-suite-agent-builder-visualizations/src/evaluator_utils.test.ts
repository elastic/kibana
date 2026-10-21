/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { skipRefusalExamples, skippedResult, withLowScoreLogging } from './evaluator_utils';

const buildEvaluator = (score: number | null, label = 'fixture'): Evaluator => ({
  name: 'Fixture Evaluator',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: jest.fn().mockResolvedValue({
    score,
    label,
    explanation: 'because',
    metadata: { mismatches: ['x: missing column'] },
  }),
});

const params = {
  input: { question: 'Create a bar chart.' },
  output: {
    errors: [],
    messages: [],
    agentTraceId: 'trace-123',
    visualizations: [
      {
        esql: 'FROM a | STATS c = COUNT(*)',
        chartType: 'xy',
        renderer: 'lens' as const,
        visualization: { type: 'xy' },
      },
    ],
  },
  expected: { config: { type: 'xy' } },
  metadata: {},
};

describe('skippedResult', () => {
  it('returns a null score with the skipped label', () => {
    expect(skippedResult('nothing to check')).toEqual({
      score: null,
      label: 'skipped',
      explanation: 'nothing to check',
    });
  });
});

describe('withLowScoreLogging', () => {
  const buildLog = () => ({ warning: jest.fn() } as unknown as ToolingLog);

  it('keeps name, kind, and result unchanged', async () => {
    const wrapped = withLowScoreLogging(buildEvaluator(0.5), buildLog());

    expect(wrapped.name).toBe('Fixture Evaluator');
    expect(wrapped.kind).toBe('CODE');
    await expect(wrapped.evaluate(params)).resolves.toEqual(
      expect.objectContaining({ score: 0.5, label: 'fixture' })
    );
  });

  it('logs question, gold, produced visualizations, metadata, and trace id on a low score', async () => {
    const log = buildLog();

    await withLowScoreLogging(buildEvaluator(0.5), log).evaluate(params);

    expect(log.warning).toHaveBeenCalledTimes(1);
    const [message] = (log.warning as jest.Mock).mock.calls[0];
    expect(message).toContain('LOW SCORE: Fixture Evaluator = 0.5');
    expect(message).toContain('Create a bar chart.');
    expect(message).toContain('"type": "xy"');
    expect(message).toContain('FROM a | STATS c = COUNT(*)');
    expect(message).toContain('x: missing column');
    expect(message).toContain('trace-123');
  });

  it('logs the follow-up turn for edit examples', async () => {
    const log = buildLog();

    await withLowScoreLogging(buildEvaluator(0), log).evaluate({
      ...params,
      input: { question: 'Create a metric.', followUp: 'Make it a pie.' },
    });

    const [message] = (log.warning as jest.Mock).mock.calls[0];
    expect(message).toContain('Follow-up:   Make it a pie.');
  });

  it('stays quiet for a full score and for a skipped null score', async () => {
    const log = buildLog();

    await withLowScoreLogging(buildEvaluator(1), log).evaluate(params);
    await withLowScoreLogging(buildEvaluator(null, 'skipped'), log).evaluate(params);

    expect(log.warning).not.toHaveBeenCalled();
  });
});

describe('skipRefusalExamples', () => {
  it('skips refusal examples and delegates otherwise', async () => {
    const inner = buildEvaluator(0);
    const wrapped = skipRefusalExamples(inner, (expected) =>
      Boolean((expected as { refusal?: unknown } | undefined)?.refusal)
    );

    const skipped = await wrapped.evaluate({ ...params, expected: { refusal: { reason: 'x' } } });
    expect(skipped).toEqual(expect.objectContaining({ score: null, label: 'skipped' }));
    expect(inner.evaluate).not.toHaveBeenCalled();

    await wrapped.evaluate(params);
    expect(inner.evaluate).toHaveBeenCalledTimes(1);
  });
});
