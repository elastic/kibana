/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { summarizeIndexPatternsMatch } from './index_patterns_feedback';

const STUB_FIELDS = { description: '', updated_at: '2025-01-01T00:00:00Z' } as const;

const makeStream = (name: string, opts?: { query: boolean }): Streams.all.Definition =>
  opts?.query
    ? {
        name,
        type: 'query' as const,
        query: { esql: `FROM ${name}`, view: name },
        ...STUB_FIELDS,
      }
    : {
        name,
        type: 'classic' as const,
        ingest: {
          processing: { steps: [], updated_at: '' },
          lifecycle: { inherit: {} },
          settings: {},
          failure_store: { disabled: {} },
          classic: {},
        },
        ...STUB_FIELDS,
      };

describe('summarizeIndexPatternsMatch', () => {
  it('counts non-query streams whose name matches any pattern', () => {
    const summary = summarizeIndexPatternsMatch(
      ['logs*'],
      [makeStream('logs.app'), makeStream('logs.nginx'), makeStream('metrics.host')]
    );

    expect(summary.matchedStreamCount).toBe(2);
    expect(summary.unmatchedPatterns).toEqual([]);
  });

  it('reports patterns that match no stream', () => {
    const summary = summarizeIndexPatternsMatch(
      ['logs*', 'metrics*'],
      [makeStream('logs.app'), makeStream('logs.nginx')]
    );

    expect(summary.matchedStreamCount).toBe(2);
    expect(summary.unmatchedPatterns).toEqual(['metrics*']);
  });

  it('counts streams purely by name, not by type', () => {
    // A query stream whose name does not match the pattern is not counted, so the
    // count and the unmatched warning describe the same population.
    const summary = summarizeIndexPatternsMatch(
      ['logs*'],
      [makeStream('my-query', { query: true }), makeStream('metrics.host')]
    );

    expect(summary.matchedStreamCount).toBe(0);
    expect(summary.unmatchedPatterns).toEqual(['logs*']);
  });

  it('counts a stream whose name matches regardless of its type', () => {
    const summary = summarizeIndexPatternsMatch(
      ['my-query'],
      [makeStream('my-query', { query: true })]
    );

    expect(summary.matchedStreamCount).toBe(1);
    expect(summary.unmatchedPatterns).toEqual([]);
  });

  it('reports query stream count separately from pattern matches', () => {
    const summary = summarizeIndexPatternsMatch(
      ['logs*'],
      [
        makeStream('logs.app'),
        makeStream('q1', { query: true }),
        makeStream('q2', { query: true }),
        makeStream('metrics.host'),
      ]
    );

    expect(summary.matchedStreamCount).toBe(1);
    expect(summary.queryStreamCount).toBe(2);
  });

  it('returns zero matches and every pattern unmatched for an empty stream list', () => {
    const summary = summarizeIndexPatternsMatch(['logs*', 'metrics*'], []);

    expect(summary.matchedStreamCount).toBe(0);
    expect(summary.unmatchedPatterns).toEqual(['logs*', 'metrics*']);
  });
});
