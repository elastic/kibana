/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { purgeKisInputSchema } from '../../common/step_types/purge_kis';
import { buildPurgeCandidatesQuery } from './purge_kis';

describe('buildPurgeCandidatesQuery', () => {
  it('reads the current revision of each KI of a data stream before filtering', () => {
    const query = buildPurgeCandidatesQuery({
      dest: { type: 'data_stream', value: 'ai-index-ds-support' },
      types: ['memory.*'],
      states: ['deleted', 'expired'],
      olderThanDays: 30,
    });

    expect(query).toBe(
      [
        'FROM ai-index-ds-support METADATA _id, _index',
        'EVAL id = COALESCE(id, _id)',
        'INLINE STATS latest = MAX(@timestamp) BY id',
        'WHERE @timestamp == latest',
        'INLINE STATS latest_doc = MAX(_id) BY id',
        'WHERE _id == latest_doc',
        'DROP latest, latest_doc',
        'WHERE type LIKE "memory.*"',
        'WHERE (governance.lifecycle.status == "deleted") OR (expires_at IS NOT NULL AND expires_at <= NOW())',
        'WHERE COALESCE(updated_at, @timestamp) <= NOW() - 30 days',
        'KEEP id',
        'LIMIT 10001',
      ].join('\n| ')
    );
  });

  it('uses the document id as the KI id on an index without revisions', () => {
    const query = buildPurgeCandidatesQuery({
      dest: { type: 'index', value: 'ai-index-idx-support' },
      types: ['memory.session_fact'],
      states: ['verification_failed'],
      olderThanDays: 0,
    });

    expect(query).toContain('| EVAL id = COALESCE(id, _id)');
    expect(query).not.toContain('INLINE STATS');
    expect(query).toContain('WHERE type == "memory.session_fact"');
    expect(query).toContain('WHERE (governance.lifecycle.status == "verification_failed")');
  });

  it('quotes types so one cannot change the query', () => {
    const query = buildPurgeCandidatesQuery({
      dest: { type: 'index', value: 'ai-index-idx-support' },
      types: ['a" OR true OR "b'],
      states: ['deleted'],
      olderThanDays: 1,
    });

    expect(query).toContain('WHERE type == "a\\" OR true OR \\"b"');
  });
});

describe('purgeKisInputSchema', () => {
  it('allows a single trailing wildcard only', () => {
    expect(purgeKisInputSchema.safeParse({ ai_index_id: 'a', types: ['memory.*'] }).success).toBe(
      true
    );
    expect(purgeKisInputSchema.safeParse({ ai_index_id: 'a', types: ['*'] }).success).toBe(false);
    expect(purgeKisInputSchema.safeParse({ ai_index_id: 'a', types: ['me*mory'] }).success).toBe(
      false
    );
    expect(purgeKisInputSchema.safeParse({ ai_index_id: 'a', types: ['memory.?'] }).success).toBe(
      false
    );
  });

  it('defaults to deleted and expired memory KIs older than 30 days', () => {
    expect(purgeKisInputSchema.parse({ ai_index_id: 'support' })).toEqual({
      ai_index_id: 'support',
      types: ['memory.*'],
      states: ['deleted', 'expired'],
      older_than_days: 30,
      dry_run: false,
    });
  });
});
