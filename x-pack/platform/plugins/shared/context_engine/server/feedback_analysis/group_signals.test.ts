/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ANALYSIS_SIGNAL_GROUPS, MAX_GROUP_SIGNAL_IDS } from '../../common/constants';
import type { Signal } from '../../common/http_api/signals';
import { groupSignals } from './group_signals';

const buildSignal = (overrides: {
  id: string;
  tags: string[];
  targetIndex?: string;
  tool?: string;
  error?: string;
  rowCount?: number;
}): Signal => ({
  signal_id: overrides.id,
  '@timestamp': '2026-09-01T12:00:00.000Z',
  signal_type: 'tool_call',
  tags: overrides.tags,
  data: {
    tool: overrides.tool ?? 'execute_esql',
    query_kind: 'ki_retrieval',
    target_index: overrides.targetIndex ?? 'ai-index-idx-orders',
    status: overrides.error ? 'Error' : 'Ok',
    looped: false,
    fell_back_to_raw: false,
    producer: 'trace_tool',
    span_id: overrides.id,
    agent: { id: 'elastic-ai-agent', name: 'Elastic AI', class: 'user' },
    query: 'FROM ai-index-idx-orders',
    returned: { row_count: overrides.rowCount ?? 0 },
    ...(overrides.error ? { error: overrides.error } : {}),
    duration_ms: 10,
    round_signals: { esql_count: 1, raw_query_count: 0, ki_retrieval_count: 1 },
  },
});

describe('groupSignals', () => {
  it('groups by tag, target index and tool', () => {
    const groups = groupSignals([
      buildSignal({ id: '1', tags: ['query_error'] }),
      buildSignal({ id: '2', tags: ['query_error'] }),
      buildSignal({ id: '3', tags: ['query_error'], tool: 'other_tool' }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ tag: 'query_error', tool: 'execute_esql', count: 2 });
    expect(groups[1]).toMatchObject({ tag: 'query_error', tool: 'other_tool', count: 1 });
  });

  it('counts a multi-tagged signal in every group it belongs to', () => {
    const groups = groupSignals([buildSignal({ id: '1', tags: ['query_error', 'coverage_gap'] })]);

    expect(groups.map(({ tag }) => tag).sort()).toEqual(['coverage_gap', 'query_error']);
  });

  it('ignores untagged signals, so healthy retrievals do not dilute the ranking', () => {
    expect(groupSignals([buildSignal({ id: '1', tags: [], rowCount: 5 })])).toEqual([]);
  });

  it('ranks a coverage gap above an equally frequent empty retrieval', () => {
    const groups = groupSignals([
      buildSignal({ id: '1', tags: ['empty_retrieval'], targetIndex: 'a' }),
      buildSignal({ id: '2', tags: ['empty_retrieval'], targetIndex: 'a' }),
      buildSignal({ id: '3', tags: ['coverage_gap'], targetIndex: 'b' }),
      buildSignal({ id: '4', tags: ['coverage_gap'], targetIndex: 'b' }),
    ]);

    expect(groups[0].tag).toBe('coverage_gap');
  });

  it('still ranks a frequent weak tag above a rare strong one', () => {
    const empty = Array.from({ length: 10 }, (_, index) =>
      buildSignal({ id: `empty-${index}`, tags: ['empty_retrieval'], targetIndex: 'a' })
    );
    const groups = groupSignals([
      ...empty,
      buildSignal({ id: 'gap', tags: ['coverage_gap'], targetIndex: 'b' }),
    ]);

    expect(groups[0]).toMatchObject({ tag: 'empty_retrieval', count: 10 });
  });

  it('prefers an example carrying an error message', () => {
    const groups = groupSignals([
      buildSignal({ id: '1', tags: ['query_error'] }),
      buildSignal({ id: '2', tags: ['query_error'], error: 'Unknown column [total]' }),
    ]);

    expect(groups[0].example?.error).toBe('Unknown column [total]');
  });

  it('caps the signal ids recorded per group but keeps the full count', () => {
    const signals = Array.from({ length: MAX_GROUP_SIGNAL_IDS + 5 }, (_, index) =>
      buildSignal({ id: `signal-${index}`, tags: ['coverage_gap'] })
    );

    const [group] = groupSignals(signals);

    expect(group.count).toBe(MAX_GROUP_SIGNAL_IDS + 5);
    expect(group.signal_ids).toHaveLength(MAX_GROUP_SIGNAL_IDS);
  });

  it('caps the number of groups', () => {
    const signals = Array.from({ length: MAX_ANALYSIS_SIGNAL_GROUPS + 5 }, (_, index) =>
      buildSignal({ id: `signal-${index}`, tags: ['coverage_gap'], targetIndex: `index-${index}` })
    );

    expect(groupSignals(signals)).toHaveLength(MAX_ANALYSIS_SIGNAL_GROUPS);
  });

  it('orders deterministically when score and count tie', () => {
    const build = () => [
      buildSignal({ id: '1', tags: ['coverage_gap'], targetIndex: 'b' }),
      buildSignal({ id: '2', tags: ['coverage_gap'], targetIndex: 'a' }),
    ];

    expect(groupSignals(build()).map(({ target_index: target }) => target)).toEqual(['a', 'b']);
    expect(groupSignals(build().reverse()).map(({ target_index: target }) => target)).toEqual([
      'a',
      'b',
    ]);
  });
});
