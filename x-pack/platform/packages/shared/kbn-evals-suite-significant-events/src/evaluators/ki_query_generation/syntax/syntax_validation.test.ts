/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEsClient } from '../test_helpers';
import { createSyntaxValidationEvaluator } from './syntax_validation';

const MATCH_HIT = 'FROM logs | WHERE body.text LIKE "*hit*"';
const MATCH_MISS = 'FROM logs | WHERE body.text LIKE "*miss*"';
const STATS_WITH_BY = 'FROM logs | STATS n = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)';
const UNGROUPED_STATS = 'FROM logs | STATS n = COUNT(*)';

const query = (esql: string, expects_matches?: boolean) => ({
  esql,
  title: 'Query',
  category: 'error' as const,
  severity_score: 50,
  ...(expects_matches !== undefined ? { expects_matches } : {}),
});

describe('syntax_validation evaluator', () => {
  it('scores full credit for valid syntax that executes successfully', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({ [MATCH_HIT]: { values: [[1]] } })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(MATCH_HIT, true)],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({
      astSyntaxValidityRate: 1,
      executionSuccessRate: 1,
      includesHitRate: true,
      executionHitRate: 1,
    });
  });

  it('differentiates AST validity from execution failure', async () => {
    const validAstBadExec = 'FROM logs | WHERE body.text:"test"';
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [validAstBadExec]: { error: new Error('field not found') },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(validAstBadExec)],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0.5);
    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.astSyntaxValidityRate).toBe(1);
    expect(metadata.executionSuccessRate).toBe(0);
    expect(result.explanation).toContain('failed ES execution');
    expect(result.explanation).not.toContain('AST parse errors');
  });

  it('abstains rather than scoring 0 when no queries were generated', async () => {
    // A run that generated nothing has no syntax to be right or wrong about. Scoring it 0 made the
    // published mean track the generation flake rate instead of query quality; `generation_success`
    // owns that failure now, and every sibling evaluator abstains here too.
    const evaluator = createSyntaxValidationEvaluator(createEsClient({}));

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBeNull();
    expect(result.explanation).toContain('No queries generated');
  });

  it('scores hit rate only for expect-match queries', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [MATCH_HIT]: { values: [[1]] },
        [MATCH_MISS]: { values: [] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(MATCH_HIT, true), query(MATCH_MISS, true)],
      expected: {},
      metadata: { failure_mode: 'some_failure' },
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.includesHitRate).toBe(true);
    expect(metadata.executionHitRate).toBe(0.5);
    expect(metadata.hitRateDenominator).toBe(2);
    expect(result.score).toBeCloseTo((1 + 1 + 0.5) / 3, 5);
    expect(result.explanation).toContain('returned no hits');
  });

  it('excludes expect-miss queries from the hit-rate denominator without scoring them 0', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [MATCH_MISS]: { values: [] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(MATCH_MISS, false)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.includesHitRate).toBe(false);
    expect(metadata.executionHitRate).toBeNull();
    expect(metadata.declaredProactiveCount).toBe(1);
    expect(metadata.acceptedWithoutIntentCount).toBe(0);
    // Both remaining score components still score 1.
    expect(result.score).toBe(1);
  });

  it('counts proactive queries that matched as proactively matched', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [MATCH_HIT]: { values: [[1]] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(MATCH_HIT, false)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.proactiveMatchedCount).toBe(1);
    expect(metadata.declaredProactiveCount).toBe(1);
    expect(metadata.declaredProactiveRate).toBe(1);
    expect(metadata.executionHitRate).toBeNull();
  });

  it('reports missing intent rather than defaulting to true', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [MATCH_MISS]: { values: [] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(MATCH_MISS)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.acceptedWithoutIntentCount).toBe(1);
    expect(metadata.includesHitRate).toBe(false);
    expect(metadata.executionHitRate).toBeNull();
  });

  it('reports omitted intent from rejected attempts, which accepted queries cannot show', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [MATCH_HIT]: { values: [[1]] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: {
        queries: [query(MATCH_HIT, true)],
        query_attempts: [
          { title: 'a', esql: MATCH_HIT, status: 'Added' as const },
          {
            title: 'b',
            esql: MATCH_HIT,
            status: 'Failed to add' as const,
            failureReason: 'missing_intent' as const,
          },
          {
            title: 'c',
            esql: MATCH_HIT,
            status: 'Failed to add' as const,
            failureReason: 'unknown_features' as const,
          },
        ],
      } as Parameters<typeof evaluator.evaluate>[0]['output'],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    // Every accepted query declared intent, so the accepted-side counter stays 0...
    expect(metadata.acceptedWithoutIntentCount).toBe(0);
    // ...while the attempt-derived counter shows the model did omit it once.
    expect(metadata.missingIntentAttemptCount).toBe(1);
  });

  it('reports missingIntentAttemptCount as null when attempts were not collected', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [MATCH_HIT]: { values: [[1]] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(MATCH_HIT, true)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.missingIntentAttemptCount).toBeNull();
  });

  it('keeps executionHitRate null and the score finite when every query is declared proactive', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [MATCH_HIT]: { values: [[1]] },
        [MATCH_MISS]: { values: [] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(MATCH_HIT, false), query(MATCH_MISS, false)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.includesHitRate).toBe(false);
    expect(metadata.executionHitRate).toBeNull();
    expect(result.score).toBe(1);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('keeps executionHitRate null when every measured query has unknown emptiness', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [UNGROUPED_STATS]: { values: [[0]] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(UNGROUPED_STATS, true)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.includesHitRate).toBe(false);
    expect(metadata.executionHitRate).toBeNull();
    expect(metadata.unknownCount).toBe(1);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('treats ungrouped STATS as unknown emptiness regardless of row count', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [UNGROUPED_STATS]: { values: [[42]] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(UNGROUPED_STATS, true)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.unknownCount).toBe(1);
    expect(metadata.matchedCount).toBe(0);
    expect(metadata.executionHitRate).toBeNull();
  });

  it('treats other ungrouped STATS aggregates as unknown without interpreting values', async () => {
    const ungroupedVariants = [
      'FROM logs | STATS s = COUNT(*)',
      'FROM logs | STATS s = SUM(bytes)',
      'FROM logs | STATS s = AVG(latency)',
    ];

    for (const esql of ungroupedVariants) {
      const evaluator = createSyntaxValidationEvaluator(
        createEsClient({ [esql]: { values: [[5]] } })
      );
      const result = await evaluator.evaluate({
        input: { sample_logs: [] },
        output: [query(esql, true)],
        expected: {},
        metadata: null,
      });
      const metadata = result.metadata as Record<string, unknown>;
      expect(metadata.unknownCount).toBe(1);
      expect(metadata.matchedCount).toBe(0);
      expect(metadata.executionHitRate).toBeNull();
    }
  });

  it('classifies STATS with BY and zero rows as empty', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [STATS_WITH_BY]: { values: [] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(STATS_WITH_BY, true)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.emptyCount).toBe(1);
    expect(metadata.matchedCount).toBe(0);
  });

  it('classifies MATCH with zero rows as empty', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [MATCH_MISS]: { values: [] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(MATCH_MISS, true)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.emptyCount).toBe(1);
    expect(metadata.matchedCount).toBe(0);
  });

  it('scores an expect-match query with no rows as a hit-rate miss', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [MATCH_MISS]: { values: [] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(MATCH_MISS, true)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.executionHitRate).toBe(0);
    expect(result.score).toBeCloseTo((1 + 1 + 0) / 3, 5);
  });

  it('marks intent as unknown and reports acceptedWithoutIntentCount when no declaration', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [MATCH_MISS]: { values: [] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(MATCH_MISS)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.acceptedWithoutIntentCount).toBe(1);
    expect(metadata.declaredProactiveCount).toBe(0);
  });

  it('correlates expectsMatches and matchOutcome on the same per-query record', async () => {
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [MATCH_HIT]: { values: [[1]] },
        [MATCH_MISS]: { values: [] },
        [UNGROUPED_STATS]: { values: [[1]] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        query(MATCH_HIT, true),
        query(MATCH_MISS, false),
        query(UNGROUPED_STATS, true),
        query(MATCH_HIT),
      ],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    const details = metadata.queries as Array<{
      expectsMatches?: boolean;
      matchOutcome: string;
    }>;
    expect(details).toHaveLength(4);
    expect(details[0]).toMatchObject({ expectsMatches: true, matchOutcome: 'matched' });
    expect(details[1]).toMatchObject({ expectsMatches: false, matchOutcome: 'empty' });
    expect(details[2]).toMatchObject({ expectsMatches: true, matchOutcome: 'unknown' });
    expect(details[3].matchOutcome).toBe('matched');
    expect(details[3].expectsMatches).toBeUndefined();
  });

  it('still lowers AST and execution validity for a proactive query with invalid ES|QL', async () => {
    const invalidEsql = 'FROM logs | WHERE ';
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [invalidEsql]: { error: new Error('syntax error') },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(invalidEsql, false)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.astSyntaxValidityRate).toBe(0);
    expect(metadata.executionSuccessRate).toBe(0);
    expect(metadata.unknownCount).toBe(1);
    expect(result.score).toBe(0);
  });

  it('fails strict parsing on a recovery AST with parser errors', async () => {
    const malformed = 'FROM logs | STATS n = COUNT(*) bogus command';
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        [malformed]: { values: [] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [query(malformed)],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.astSyntaxValidityRate).toBe(0);
    expect(metadata.unknownCount).toBe(1);
    const details = metadata.queries as Array<{ astError?: string }>;
    expect(details[0].astError).toBeTruthy();
  });

  it('exposes frozen-fixture counts for customer-0 derived cases', async () => {
    const negatedAllowlist = 'FROM logs | WHERE NOT (User-Agent == "axios/1.16.1")';
    const uniformSeverity =
      'FROM logs | WHERE log.logger == "models.sparsetextembeddings.parser" AND log.level IN ("ERROR","error")';
    const neverCoOccurring =
      'FROM logs | WHERE context.admin_console_url != null AND error.message != null';
    const evaluator = createSyntaxValidationEvaluator(
      createEsClient({
        // 2026-08-10 frozen probe result: negated allowlist now matches rows.
        [negatedAllowlist]: { values: [[1], [2], [3]] },
        [uniformSeverity]: { values: [] },
        [neverCoOccurring]: { values: [] },
      })
    );

    const result = await evaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        query(negatedAllowlist, true),
        query(uniformSeverity, true),
        query(neverCoOccurring, true),
      ],
      expected: {},
      metadata: null,
    });

    const metadata = result.metadata as Record<string, unknown>;
    expect(metadata.matchedCount).toBe(1);
    expect(metadata.emptyCount).toBe(2);
    expect(metadata.executionHitRate).toBeCloseTo(1 / 3, 5);
  });
});
