/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface RecordedSpan {
  name: string;
  opts: { attributes?: Record<string, unknown> };
}

const mockRecordedSpans: RecordedSpan[] = [];

jest.mock('@kbn/tracing-utils', () => ({
  createWithActiveSpan:
    () =>
    (name: string, opts: RecordedSpan['opts'], _ctx: unknown, cb: (span?: unknown) => unknown) => {
      mockRecordedSpans.push({ name, opts });
      return cb({ spanContext: () => ({ traceId: 'trace-id' }) });
    },
}));

import { JUDGE_SPAN_NAME_PREFIX } from '@kbn/evals-common';
import { withEvaluatorSpan } from './tracing';

describe('withEvaluatorSpan', () => {
  beforeEach(() => {
    mockRecordedSpans.length = 0;
  });

  it('names LLM-judge roots `judge · <name>` so they clear the non-judge evaluator-root filter', async () => {
    await withEvaluatorSpan('goal_pass', {}, async () => 'done', { kind: 'LLM' });

    expect(mockRecordedSpans).toHaveLength(1);
    const [span] = mockRecordedSpans;
    expect(span.name).toBe(`${JUDGE_SPAN_NAME_PREFIX}goal_pass`);
    expect(span.name).toBe('judge · goal_pass');
    // The bare evaluator name is always kept on the attribute regardless of span name.
    expect(span.opts.attributes?.['evaluator.name']).toBe('goal_pass');
  });

  it('leaves CODE (non-LLM) evaluator roots with their bare name', async () => {
    await withEvaluatorSpan('latency', {}, async () => 'done', { kind: 'CODE' });

    const [span] = mockRecordedSpans;
    expect(span.name).toBe('latency');
    expect(span.opts.attributes?.['evaluator.name']).toBe('latency');
  });

  it('leaves the root bare when no kind is provided (backwards compatible)', async () => {
    await withEvaluatorSpan('CorrectnessAnalysis', {}, async () => 'done');

    const [span] = mockRecordedSpans;
    expect(span.name).toBe('CorrectnessAnalysis');
  });
});
