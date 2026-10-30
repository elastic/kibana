/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  guessRecoveryBlock,
  discoverQueryToRuleQuery,
  splitResultToRuleQuery,
} from './use_heuristic_split';

// ── guessRecoveryBlock ────────────────────────────────────────────────────────

describe('discoverQueryToRuleQuery', () => {
  it('splits a WHERE clause into base and breach segment', () => {
    const result = discoverQueryToRuleQuery('FROM logs-* | WHERE status == "error" | LIMIT 10');
    expect(result.base).toBe('FROM logs-*');
    expect(result.breach.segment).toContain('WHERE');
  });

  it('leaves breach segment empty when query has no WHERE', () => {
    const result = discoverQueryToRuleQuery('FROM logs-* | LIMIT 10');
    expect(result.base).toBe('FROM logs-* | LIMIT 10');
    expect(result.breach.segment).toBe('');
  });
});

describe('guessRecoveryBlock', () => {
  it('flips > to <', () => {
    expect(guessRecoveryBlock('| WHERE count > 100')).toBe('| WHERE count < 100');
  });

  it('flips < to >', () => {
    expect(guessRecoveryBlock('| WHERE count < 100')).toBe('| WHERE count > 100');
  });

  it('flips >= to <=', () => {
    expect(guessRecoveryBlock('| WHERE count >= 100')).toBe('| WHERE count <= 100');
  });

  it('flips <= to >=', () => {
    expect(guessRecoveryBlock('| WHERE count <= 100')).toBe('| WHERE count >= 100');
  });

  it('correctly flips >= without also flipping the inner >', () => {
    // The single-pass regex must not produce `<<=` by flipping >= → <= and then < → >
    const result = guessRecoveryBlock('| WHERE count >= 100');
    expect(result).toBe('| WHERE count <= 100');
  });

  it('correctly flips <= without also flipping the inner <', () => {
    const result = guessRecoveryBlock('| WHERE count <= 100');
    expect(result).toBe('| WHERE count >= 100');
  });

  /*
   * Intentionally a naive per-operator flip, NOT De Morgan's logical negation.
   * True negation of (a > 1 AND b < 2) would be (a <= 1 OR b >= 2), but
   * guessRecoveryBlock only flips operators and preserves connectives. This is
   * fine as a heuristic seed — users refine the result in the Recovery editor.
   */
  it('handles multiple operators in one expression', () => {
    const result = guessRecoveryBlock('| WHERE a > 1 AND b < 2');
    expect(result).toBe('| WHERE a < 1 AND b > 2');
  });

  it('leaves the block unchanged when there are no comparison operators', () => {
    const block = '| WHERE status == "critical"';
    expect(guessRecoveryBlock(block)).toBe(block);
  });

  it('returns the input unchanged for an empty string', () => {
    expect(guessRecoveryBlock('')).toBe('');
  });
});

// ── splitResultToRuleQuery ──────────────────────────────────────────────────

describe('splitResultToRuleQuery', () => {
  it('returns outcome "success" when base and alert are found', () => {
    const { query, outcome } = splitResultToRuleQuery(
      'FROM logs-*\n| STATS count = COUNT(*) BY host.name\n| WHERE count > 100'
    );

    expect(outcome).toBe('success');
    expect(query.base).toContain('STATS');
    expect(query.breach.segment).toContain('WHERE count > 100');
  });

  it('returns an empty segment and outcome "no_alert_condition" when there is no WHERE', () => {
    const fullQuery = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name';
    const { query, outcome } = splitResultToRuleQuery(fullQuery);

    expect(outcome).toBe('no_alert_condition');
    // Whole pipeline stays in base; an empty segment drops `breach` at save.
    expect(query.base).toBe(fullQuery);
    expect(query.breach.segment).toBe('');
  });

  it('returns outcome "empty" for an empty query', () => {
    const { query, outcome } = splitResultToRuleQuery('   ');

    expect(outcome).toBe('empty');
    expect(query.base).toBe('');
    expect(query.breach.segment).toBe('');
  });

  it('returns outcome "split_failed" when the heuristic cannot isolate a base', () => {
    // A leading-WHERE-only pipeline has no non-WHERE base command.
    const { query, outcome } = splitResultToRuleQuery('| WHERE count > 100');

    expect(outcome).toBe('split_failed');
    expect(query.base).toBe('');
    expect(query.breach.segment).toContain('WHERE count > 100');
  });

  it('produces only base and breach — recovery is no longer part of the query', () => {
    const { query } = splitResultToRuleQuery('FROM logs-* | STATS c = COUNT(*) | WHERE c > 1');
    expect(Object.keys(query).sort()).toEqual(['base', 'breach']);
  });

  it('never produces a duplicated base when re-applied to its own joined output', () => {
    const first = splitResultToRuleQuery(
      'FROM logs-*\n| STATS count = COUNT(*) BY host.name\n| WHERE count > 100'
    );
    const joined = `${first.query.base}\n${first.query.breach.segment}`;
    const second = splitResultToRuleQuery(joined);

    expect(second.query.base).toBe(first.query.base);
    expect(second.query.breach.segment).toBe(first.query.breach.segment);
  });
});
