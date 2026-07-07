/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorContext } from '../types';
import { inputTokensEvaluatorDef, TRACE_METRIC_RETRY } from '.';

const TRACE_ID = 'a'.repeat(32);

const buildLogger = () =>
  ({
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  } as unknown as EvaluatorContext['log']);

/** Builds an ES|QL response with a single `input_tokens` column (empty = no rows). */
const esqlResponse = (value: number | null) => ({
  columns: [{ name: 'input_tokens', type: 'long' }],
  values: value === null ? [] : [[value]],
});

const buildContext = (query: jest.Mock, log = buildLogger()): EvaluatorContext =>
  ({
    trace: { traceId: TRACE_ID, esClient: { esql: { query } } },
    log,
  } as unknown as EvaluatorContext);

describe('trace metric evaluator (input_tokens)', () => {
  afterEach(() => jest.useRealTimers());

  it('returns the metric on the first successful query', async () => {
    const query = jest.fn().mockResolvedValue(esqlResponse(42));

    const result = await inputTokensEvaluatorDef.evaluate(buildContext(query));

    expect(result).toEqual({ scores: [{ name: 'input_tokens', score: 42 }] });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('retries while the trace is not yet queryable, then returns the metric', async () => {
    jest.useFakeTimers();
    const query = jest
      .fn()
      .mockResolvedValueOnce(esqlResponse(null))
      .mockResolvedValueOnce(esqlResponse(null))
      .mockResolvedValue(esqlResponse(7));

    const promise = inputTokensEvaluatorDef.evaluate(buildContext(query));
    await jest.advanceTimersByTimeAsync(TRACE_METRIC_RETRY.baseDelayMs * 8);

    await expect(promise).resolves.toEqual({ scores: [{ name: 'input_tokens', score: 7 }] });
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('returns "unavailable" after exhausting retries', async () => {
    jest.useFakeTimers();
    const query = jest.fn().mockResolvedValue(esqlResponse(null));
    const log = buildLogger();

    const promise = inputTokensEvaluatorDef.evaluate(buildContext(query, log));
    await jest.advanceTimersByTimeAsync(
      TRACE_METRIC_RETRY.maxDelayMs * TRACE_METRIC_RETRY.maxAttempts
    );

    await expect(promise).resolves.toEqual({
      scores: [{ name: 'input_tokens', label: 'unavailable' }],
    });
    expect(query).toHaveBeenCalledTimes(TRACE_METRIC_RETRY.maxAttempts);
    expect(log.warn).toHaveBeenCalled();
  });
});
