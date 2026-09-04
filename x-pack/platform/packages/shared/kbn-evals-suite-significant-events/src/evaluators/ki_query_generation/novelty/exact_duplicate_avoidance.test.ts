/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIQueryGenerationEvaluationExample } from '../types';
import { exactDuplicateAvoidanceEvaluator } from './exact_duplicate_avoidance';

const seeds = [
  { id: 'seed-1', title: 'JDBC error', type: 'match', esql: 'FROM logs | WHERE message == "x"' },
];

const evaluate = (input: Partial<KIQueryGenerationEvaluationExample['input']>, output: unknown) =>
  exactDuplicateAvoidanceEvaluator.evaluate({
    input: input as KIQueryGenerationEvaluationExample['input'],
    output: output as Parameters<typeof exactDuplicateAvoidanceEvaluator.evaluate>[0]['output'],
    expected: {},
    metadata: null,
  });

const attempt = (
  status: 'Added' | 'Duplicate' | 'Failed to add',
  overrides: Record<string, unknown> = {}
) => ({
  title: 'Attempt',
  esql: 'FROM logs | WHERE message == "x"',
  status,
  // The producer sets this whenever attempts are collected; 'Duplicate' implies it.
  exactDuplicate: status === 'Duplicate',
  ...overrides,
});

describe('exact_duplicate_avoidance evaluator', () => {
  it('abstains when no existing_queries were seeded (inert on clean arms)', async () => {
    const result = await evaluate({}, { queries: [], query_attempts: [] });

    expect(result.score).toBeNull();
    expect(result.explanation).toContain('No existing queries seeded');
  });

  it('abstains with a diagnostics-missing explanation when seeds exist but query_attempts are absent', async () => {
    const result = await evaluate(
      { existing_queries: seeds },
      { queries: [{ esql: 'FROM logs | WHERE message == "z"', title: 'Z' }] as unknown[] }
    );

    expect(result.score).toBeNull();
    expect(result.explanation).toContain('query_attempts');
  });

  it('observes server-rejected exact duplicates even when no query was accepted', async () => {
    const result = await evaluate(
      { existing_queries: seeds },
      {
        queries: [],
        query_attempts: [attempt('Duplicate')],
      }
    );

    expect(result.score).toBe(0);
    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.exactDuplicateAttemptCount).toBe(1);
    expect(metadata.acceptedCount).toBe(0);
  });

  it('scores 0.9 for ten attempts with one exact duplicate', async () => {
    const result = await evaluate(
      { existing_queries: seeds },
      {
        queries: [],
        query_attempts: [
          ...Array.from({ length: 9 }, () => attempt('Added')),
          attempt('Duplicate'),
        ],
      }
    );

    expect(result.score).toBeCloseTo(0.9, 5);
    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.attemptedQueryCount).toBe(10);
    expect(metadata.exactDuplicateAttemptCount).toBe(1);
    expect(metadata.acceptedCount).toBe(9);
  });

  it('reports failed-to-add attempts without scoring them as duplicates', async () => {
    const result = await evaluate(
      { existing_queries: seeds },
      {
        queries: [],
        query_attempts: [attempt('Failed to add'), attempt('Added')],
      }
    );

    expect(result.score).toBe(1);
    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.failedCount).toBe(1);
    expect(metadata.exactDuplicateAttemptCount).toBe(0);
  });

  it('abstains rather than scoring a perfect 1.0 when nothing was attempted', async () => {
    const result = await evaluate({ existing_queries: seeds }, { queries: [], query_attempts: [] });

    expect(result.score).toBeNull();
    expect(result.explanation).toContain('No queries attempted');
  });

  it('counts a duplicate that an earlier validation gate rejected first', async () => {
    // `status` is first-failure-wins, so this duplicate surfaces as 'Failed to add'.
    // Scoring must follow `exactDuplicate`, not `status`.
    const result = await evaluate(
      { existing_queries: seeds },
      {
        queries: [],
        query_attempts: [
          attempt('Failed to add', { exactDuplicate: true, failureReason: 'missing_intent' }),
          attempt('Added'),
        ],
      }
    );

    expect(result.score).toBeCloseTo(0.5, 5);
    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.exactDuplicateAttemptCount).toBe(1);
    // The dedup gate never saw it, so the status-based count stays 0.
    expect(metadata.rejectedAsDuplicateCount).toBe(0);
  });
});
