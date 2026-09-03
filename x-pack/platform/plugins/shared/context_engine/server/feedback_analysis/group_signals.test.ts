/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ANALYSIS_SIGNAL_GROUPS } from '../../common/constants';
import type { SignalPatternCandidate } from './group_signals';
import { rankPatterns } from './group_signals';

const candidate = (overrides: Partial<SignalPatternCandidate> = {}): SignalPatternCandidate => ({
  tag: 'query_error',
  target_index: 'ai-index-idx-orders',
  tool: 'execute_esql',
  count: 1,
  signal_ids: [],
  ...overrides,
});

describe('rankPatterns', () => {
  it('scores a pattern by its count weighted by how actionable the tag is', () => {
    const [gap, error, empty, unknown] = rankPatterns([
      candidate({ tag: 'coverage_gap', count: 2, target_index: 'a' }),
      candidate({ tag: 'query_error', count: 2, target_index: 'b' }),
      candidate({ tag: 'empty_retrieval', count: 2, target_index: 'c' }),
      candidate({ tag: 'something_new', count: 2, target_index: 'd' }),
    ]);

    expect(gap).toMatchObject({ tag: 'coverage_gap', score: 6 });
    expect(error).toMatchObject({ tag: 'query_error', score: 4 });
    expect(empty).toMatchObject({ tag: 'empty_retrieval', score: 3 });
    expect(unknown).toMatchObject({ tag: 'something_new', score: 2 });
  });

  it('ranks a coverage gap above an equally frequent empty retrieval', () => {
    const groups = rankPatterns([
      candidate({ tag: 'empty_retrieval', count: 2, target_index: 'a' }),
      candidate({ tag: 'coverage_gap', count: 2, target_index: 'b' }),
    ]);

    expect(groups[0].tag).toBe('coverage_gap');
  });

  it('still ranks a frequent weak tag above a rare strong one', () => {
    const groups = rankPatterns([
      candidate({ tag: 'empty_retrieval', count: 10, target_index: 'a' }),
      candidate({ tag: 'coverage_gap', count: 1, target_index: 'b' }),
    ]);

    expect(groups[0]).toMatchObject({ tag: 'empty_retrieval', count: 10 });
  });

  it('drops a candidate with no signals behind it', () => {
    expect(rankPatterns([candidate({ count: 0 })])).toEqual([]);
  });

  it('carries the example and provenance ids through untouched', () => {
    const [group] = rankPatterns([
      candidate({
        count: 3,
        signal_ids: ['a', 'b'],
        example: { query: 'FROM orders', error: 'boom', row_count: 0 },
      }),
    ]);

    expect(group.signal_ids).toEqual(['a', 'b']);
    expect(group.example).toEqual({ query: 'FROM orders', error: 'boom', row_count: 0 });
  });

  it('omits the example key entirely when the sample held nothing for the pattern', () => {
    const [group] = rankPatterns([candidate({ count: 3 })]);

    expect(group).not.toHaveProperty('example');
  });

  it('caps the number of groups', () => {
    const candidates = Array.from({ length: MAX_ANALYSIS_SIGNAL_GROUPS + 5 }, (_, index) =>
      candidate({ tag: 'coverage_gap', target_index: `index-${index}` })
    );

    expect(rankPatterns(candidates)).toHaveLength(MAX_ANALYSIS_SIGNAL_GROUPS);
  });

  it('orders deterministically when score and count tie', () => {
    const build = () => [
      candidate({ tag: 'coverage_gap', target_index: 'b' }),
      candidate({ tag: 'coverage_gap', target_index: 'a' }),
    ];

    expect(rankPatterns(build()).map(({ target_index: target }) => target)).toEqual(['a', 'b']);
    expect(rankPatterns(build().reverse()).map(({ target_index: target }) => target)).toEqual([
      'a',
      'b',
    ]);
  });
});
