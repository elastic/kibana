/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexItem } from '../../common/http_api/ai_indices';
import { applyKiLifecycle } from '../ai_indices/ki_lifecycle';
import { buildAiIndexRecallQuery, createAiIndexRecallStore } from './ai_index_store';

const aiIndex = (id: string, type: 'index' | 'data_stream', value: string) =>
  ({ id, dest: { type, value } } as AiIndexItem);

const columns = ['id', '_id', '_index', 'content', '@timestamp'].map((name) => ({
  name,
  type: 'keyword',
}));

describe('createAiIndexRecallStore', () => {
  let list: jest.Mock;
  let query: jest.Mock;

  beforeEach(() => {
    list = jest.fn();
    query = jest.fn();
  });

  const search = (aiIndexIds?: string[]) =>
    createAiIndexRecallStore({ list, query }).search({ query: 'checkout', aiIndexIds });

  it('returns nothing when no AI index is readable', async () => {
    list.mockResolvedValue([]);

    expect(await search(['ops-memory'])).toEqual([]);
    expect(list).toHaveBeenCalledWith(['ops-memory']);
    expect(query).not.toHaveBeenCalled();
  });

  it('maps rows to candidates with their AI index id', async () => {
    list.mockResolvedValue([
      aiIndex('ops-memory', 'index', 'ai-index-idx-ops-memory'),
      aiIndex('ops-stream', 'data_stream', 'ai-index-ds-ops-stream'),
    ]);
    query.mockResolvedValue({
      columns,
      values: [
        ['ki-1', 'doc-1', 'ai-index-idx-ops-memory', 'pool limit', '2026-11-07T02:00:41Z'],
        [null, 'doc-2', '.ds-ai-index-ds-ops-stream-2026.11.07-000001', 'rolled back', null],
        ['ki-3', 'doc-3', 'ai-index-idx-ops-memory', null, null],
      ],
    });

    expect(await search()).toEqual([
      {
        id: 'ki-1',
        source: 'ai_index',
        content: 'pool limit',
        date: '2026-11-07T02:00:41Z',
        ai_index_id: 'ops-memory',
      },
      { id: 'doc-2', source: 'ai_index', content: 'rolled back', ai_index_id: 'ops-stream' },
    ]);
    expect(query).toHaveBeenCalledWith({
      query: buildAiIndexRecallQuery(['ai-index-idx-ops-memory', 'ai-index-ds-ops-stream']),
      params: { query: 'checkout' },
      limit: 50,
    });
  });
});

describe('buildAiIndexRecallQuery', () => {
  it('builds a query the lifecycle pipeline accepts', () => {
    const dest = { type: 'data_stream' as const, value: 'ai-index-ds-ops-stream' };
    const query = applyKiLifecycle(buildAiIndexRecallQuery([dest.value]), [dest]);

    expect(query).toContain('governance.lifecycle.status');
    expect(query).toContain('FORK');
    expect(query).toContain('FUSE');
  });
});
