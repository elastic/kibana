/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsToolUsage } from '@kbn/streams-ai';

import type { KIQueryGenerationOutput, QueryAttempt } from './types';
import { expectedGenerationOutcomeEvaluator } from './expected_generation_outcome';

const output = (queryCount: number): KIQueryGenerationOutput =>
  Array.from({ length: queryCount }, (_, index) => ({
    esql: `FROM logs | WHERE index = ${index}`,
    title: `query-${index}`,
    category: 'error',
    severity_score: 1,
  }));

const objectOutput = (
  overrides: Partial<{
    queries: KIQueryGenerationOutput;
    query_attempts: QueryAttempt[];
    toolUsage: SignificantEventsToolUsage;
  }> = {}
): KIQueryGenerationOutput =>
  ({
    queries: [],
    ...overrides,
  } as KIQueryGenerationOutput);

const defaultToolUsage = (): SignificantEventsToolUsage => ({
  get_stream_features: { calls: 1, failures: 0, latency_ms: 0 },
  add_queries: { calls: 0, failures: 0, latency_ms: 0 },
});

const attempt = (overrides: Partial<QueryAttempt> = {}): QueryAttempt => ({
  title: 'query',
  esql: 'FROM logs | WHERE message == "x"',
  status: 'Added',
  ...overrides,
});

const evaluate = async (taskOutput: KIQueryGenerationOutput) =>
  expectedGenerationOutcomeEvaluator.evaluate({
    input: {},
    output: taskOutput,
    expected: { expect_queries: false },
    metadata: null,
  });

describe('expectedGenerationOutcomeEvaluator', () => {
  it('scores null when the example carries no expect_queries contract', async () => {
    const result = await expectedGenerationOutcomeEvaluator.evaluate({
      input: {},
      output: output(1),
      expected: {},
      metadata: null,
    });
    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });

  it('passes when expect_queries is true and queries are accepted', async () => {
    const result = await expectedGenerationOutcomeEvaluator.evaluate({
      input: {},
      output: output(1),
      expected: { expect_queries: true },
      metadata: null,
    });
    expect(result.score).toBe(1);
    expect(result.label).toBe('PASS');
  });

  it('fails when expect_queries is true and no query is accepted', async () => {
    const result = await expectedGenerationOutcomeEvaluator.evaluate({
      input: {},
      output: output(0),
      expected: { expect_queries: true },
      metadata: null,
    });
    expect(result.score).toBe(0);
    expect(result.label).toBe('FAIL');
  });

  it('scores null when expect_queries is false and query attempts were not collected', async () => {
    const result = await evaluate(objectOutput());
    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
    expect(result.explanation).toContain('query attempts were not collected');
  });

  it('scores null when tool usage was not collected', async () => {
    const result = await evaluate(objectOutput({ query_attempts: [] }));
    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
    expect(result.explanation).toContain('tool usage was not collected');
  });

  it('passes a clean empty-stream result', async () => {
    const result = await evaluate(
      objectOutput({ query_attempts: [], toolUsage: defaultToolUsage() })
    );
    expect(result.score).toBe(1);
    expect(result.label).toBe('PASS');
  });

  it('fails when expect_queries is false and any query is accepted', async () => {
    const result = await evaluate(output(2));
    expect(result.score).toBe(0);
    expect(result.label).toBe('FAIL');
  });

  it('fails when add_queries was called even with no attempts recorded', async () => {
    const result = await evaluate(
      objectOutput({
        query_attempts: [],
        toolUsage: { ...defaultToolUsage(), add_queries: { calls: 1, failures: 0, latency_ms: 0 } },
      })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('1 add_queries calls');
  });

  it('fails when feature inspection never ran', async () => {
    const result = await evaluate(
      objectOutput({
        query_attempts: [],
        toolUsage: {
          ...defaultToolUsage(),
          get_stream_features: { calls: 0, failures: 0, latency_ms: 0 },
        },
      })
    );
    expect(result.score).toBe(0);
  });

  it('fails when feature inspection failed', async () => {
    const result = await evaluate(
      objectOutput({
        query_attempts: [],
        toolUsage: {
          ...defaultToolUsage(),
          get_stream_features: { calls: 1, failures: 1, latency_ms: 0 },
        },
      })
    );
    expect(result.score).toBe(0);
  });

  it('fails on non-empty query attempts and names the distinct failure outcomes', async () => {
    const result = await evaluate(
      objectOutput({
        query_attempts: [
          attempt({ status: 'Failed to add', failureReason: 'unknown_features' }),
          attempt({ status: 'Failed to add', failureReason: 'unknown_features' }),
          attempt({ status: 'Failed to add', failureReason: 'validation_error' }),
        ],
        toolUsage: defaultToolUsage(),
      })
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('(unknown_features, validation_error)');
    expect(result.explanation).not.toContain('unknown_features, unknown_features');
  });
});
