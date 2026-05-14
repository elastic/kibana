/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { splitQuery, guessRecoveryBlock } from './use_heuristic_split';

// ── splitQuery ────────────────────────────────────────────────────────────────

describe('splitQuery', () => {
  describe('empty / trivial input', () => {
    it('returns none confidence for an empty string', () => {
      const result = splitQuery('');
      expect(result.confidence).toBe('none');
      expect(result.base).toBe('');
      expect(result.alertBlock).toBe('');
    });

    it('returns none confidence for whitespace-only input', () => {
      const result = splitQuery('   ');
      expect(result.confidence).toBe('none');
    });
  });

  describe('no STATS segment', () => {
    it('returns none confidence and puts the whole query as alertBlock when there is no STATS', () => {
      const query = 'FROM logs-* | WHERE count > 0';
      const result = splitQuery(query);
      expect(result.confidence).toBe('none');
      expect(result.reason).toBe('no_stats');
      expect(result.alertBlock).toBe(query.trim());
      expect(result.base).toBe('');
    });
  });

  describe('STATS present but no WHERE after it', () => {
    it('returns low confidence and base = full query', () => {
      const query = 'FROM logs-* | STATS count = COUNT(*) BY host.name';
      const result = splitQuery(query);
      expect(result.confidence).toBe('low');
      expect(result.reason).toBe('no_where');
      expect(result.base).toBe(query.trim());
      expect(result.alertBlock).toBe('');
    });
  });

  describe('high-confidence split — standard alerting pattern', () => {
    it('splits a multi-line query correctly', () => {
      const query = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name\n| WHERE count > 100';
      const result = splitQuery(query);
      expect(result.confidence).toBe('high');
      expect(result.reason).toBe('split_succeeded');
      expect(result.base).toBe('FROM logs-*\n| STATS count = COUNT(*) BY host.name');
      expect(result.alertBlock).toBe('| WHERE count > 100');
    });

    it('splits a single-line query correctly', () => {
      const query = 'FROM logs-* | STATS count = COUNT(*) BY host.name | WHERE count > 0';
      const result = splitQuery(query);
      expect(result.confidence).toBe('high');
      expect(result.base).toBe('FROM logs-* | STATS count = COUNT(*) BY host.name');
      expect(result.alertBlock).toBe('| WHERE count > 0');
    });

    it('uses the LAST STATS when multiple STATS exist', () => {
      const query =
        'FROM logs-* | STATS a = COUNT(*) | EVAL b = a * 2 | STATS c = MAX(b) BY host.name | WHERE c > 50';
      const result = splitQuery(query);
      expect(result.confidence).toBe('high');
      // base should end at the last STATS
      expect(result.base).toContain('STATS c = MAX(b) BY host.name');
      expect(result.alertBlock).toBe('| WHERE c > 50');
    });

    it('handles EVAL and KEEP segments between STATS and WHERE', () => {
      const query =
        'FROM logs-* | STATS avg_cpu = AVG(cpu) BY host.name | EVAL status = CASE(avg_cpu > 0.9, "critical", "ok") | WHERE status == "critical"';
      const result = splitQuery(query);
      expect(result.confidence).toBe('high');
      expect(result.base).toContain('STATS avg_cpu');
      expect(result.base).toContain('EVAL status');
      expect(result.alertBlock).toBe('| WHERE status == "critical"');
    });
  });

  describe('pipe-in-string safety', () => {
    it('does not split on a pipe inside a single-quoted string', () => {
      const query = "FROM logs-* | STATS count = COUNT(*) BY host.name | WHERE name == 'foo|bar'";
      const result = splitQuery(query);
      // The pipe inside 'foo|bar' must not create a false segment boundary
      expect(result.confidence).toBe('high');
      expect(result.alertBlock).toBe("| WHERE name == 'foo|bar'");
    });

    it('does not split on a pipe inside a triple-quoted string', () => {
      const query =
        "FROM logs-* | STATS count = COUNT(*) BY host.name | WHERE msg == '''hello|world'''";
      const result = splitQuery(query);
      expect(result.confidence).toBe('high');
      expect(result.alertBlock).toBe("| WHERE msg == '''hello|world'''");
    });
  });

  describe('reason field', () => {
    it('reason is no_stats when no STATS found', () => {
      // FROM logs-* has no pipe at all so tokeniseSegments yields one segment (FROM) with no STATS
      expect(splitQuery('FROM logs-*').reason).toBe('no_stats');
      // FROM logs-* | WHERE x > 1 has a WHERE but still no STATS
      expect(splitQuery('FROM logs-* | WHERE x > 1').reason).toBe('no_stats');
    });

    it('reason is no_where when STATS present but no WHERE', () => {
      expect(splitQuery('FROM logs-* | STATS c = COUNT(*)').reason).toBe('no_where');
    });

    it('reason is split_succeeded on a successful split', () => {
      expect(splitQuery('FROM logs-* | STATS c = COUNT(*) | WHERE c > 1').reason).toBe(
        'split_succeeded'
      );
    });
  });
});

// ── guessRecoveryBlock ────────────────────────────────────────────────────────

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

  // Intentionally a naive per-operator flip, NOT De Morgan's logical negation.
  // True negation of (a > 1 AND b < 2) would be (a <= 1 OR b >= 2), but
  // guessRecoveryBlock only flips operators and preserves connectives. This is
  // fine as a heuristic seed — users refine the result in the Recovery editor.
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
