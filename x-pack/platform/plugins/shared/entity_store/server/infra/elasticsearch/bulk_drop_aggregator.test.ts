/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkDropAggregator, formatBulkDropSummary } from './bulk_drop_aggregator';
import type { BulkDropTypeSummary } from './bulk_drop_aggregator';

describe('BulkDropAggregator', () => {
  it('starts empty', () => {
    const aggregator = new BulkDropAggregator();
    expect(aggregator.total).toBe(0);
    expect(aggregator.summary()).toEqual([]);
  });

  it('groups drops by error.type', () => {
    const aggregator = new BulkDropAggregator();
    aggregator.record({
      status: 403,
      error: { type: 'security_exception', reason: 'unauthorized' },
    });
    aggregator.record({
      status: 403,
      error: { type: 'security_exception', reason: 'unauthorized' },
    });
    aggregator.record({
      status: 400,
      error: { type: 'mapper_parsing_exception', reason: 'bad field' },
    });

    const summary = aggregator.summary();
    expect(summary).toHaveLength(2);
    expect(summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'security_exception', count: 2 }),
        expect.objectContaining({ type: 'mapper_parsing_exception', count: 1 }),
      ])
    );
  });

  it('falls back to "unknown" when error.type is absent', () => {
    const aggregator = new BulkDropAggregator();
    aggregator.record({ status: 500, error: null });
    aggregator.record({ status: 500, error: {} });

    const summary = aggregator.summary();
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({ type: 'unknown', count: 2, sampleReason: 'unknown error' });
  });

  it('retains the status and reason of the first drop seen for each type as a representative sample', () => {
    const aggregator = new BulkDropAggregator();
    aggregator.record({
      status: 403,
      error: { type: 'security_exception', reason: 'first reason' },
    });
    aggregator.record({
      status: 403,
      error: { type: 'security_exception', reason: 'second reason' },
    });

    const summary = aggregator.summary();
    expect(summary[0]).toMatchObject({ status: 403, sampleReason: 'first reason', count: 2 });
  });

  it('counts total drops across all types', () => {
    const aggregator = new BulkDropAggregator();
    aggregator.record({ status: 403, error: { type: 'security_exception' } });
    aggregator.record({ status: 400, error: { type: 'mapper_parsing_exception' } });
    aggregator.record({ status: 400, error: { type: 'mapper_parsing_exception' } });

    expect(aggregator.total).toBe(3);
  });

  it('sorts the summary by count descending', () => {
    const aggregator = new BulkDropAggregator();
    aggregator.record({ status: 400, error: { type: 'rare_exception' } });
    aggregator.record({ status: 403, error: { type: 'common_exception' } });
    aggregator.record({ status: 403, error: { type: 'common_exception' } });
    aggregator.record({ status: 403, error: { type: 'common_exception' } });

    expect(aggregator.summary().map((s) => s.type)).toEqual(['common_exception', 'rare_exception']);
  });

  describe('format', () => {
    it('formats a single type with count, status, and sample reason', () => {
      const aggregator = new BulkDropAggregator();
      for (let i = 0; i < 5000; i++) {
        aggregator.record({
          status: 403,
          error: { type: 'security_exception', reason: 'action unauthorized for service account' },
        });
      }

      expect(aggregator.format()).toBe(
        'security_exception (5000, status 403): action unauthorized for service account'
      );
    });

    it('joins multiple types with " | "', () => {
      const aggregator = new BulkDropAggregator();
      aggregator.record({
        status: 403,
        error: { type: 'security_exception', reason: 'unauthorized' },
      });
      aggregator.record({
        status: 403,
        error: { type: 'security_exception', reason: 'unauthorized' },
      });
      aggregator.record({
        status: 400,
        error: { type: 'mapper_parsing_exception', reason: 'bad field' },
      });

      expect(aggregator.format()).toBe(
        'security_exception (2, status 403): unauthorized | mapper_parsing_exception (1, status 400): bad field'
      );
    });
  });
});

describe('formatBulkDropSummary', () => {
  const makeSummary = (count: number, type = 'error'): BulkDropTypeSummary => ({
    type,
    count,
    status: 400,
    sampleReason: 'reason',
  });

  it('returns an empty string for an empty summary', () => {
    expect(formatBulkDropSummary([])).toBe('');
  });

  it('caps the number of shown types and appends an overflow suffix', () => {
    const summary = Array.from({ length: 7 }, (_, i) => makeSummary(7 - i, `type_${i}`));
    const formatted = formatBulkDropSummary(summary, 5);
    expect(formatted).toContain('(+2 more error types)');
    expect(formatted).not.toContain('type_5');
    expect(formatted).not.toContain('type_6');
  });

  it('does not append an overflow suffix when within the cap', () => {
    const summary = [makeSummary(2, 'a'), makeSummary(1, 'b')];
    expect(formatBulkDropSummary(summary, 5)).not.toContain('more error types');
  });

  it('respects a custom maxTypes', () => {
    const summary = [makeSummary(3, 'a'), makeSummary(2, 'b'), makeSummary(1, 'c')];
    const formatted = formatBulkDropSummary(summary, 1);
    expect(formatted).toContain('a (3');
    expect(formatted).not.toContain('b (2');
    expect(formatted).toContain('(+2 more error types)');
  });
});
