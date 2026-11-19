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
    query = jest.fn().mockResolvedValue({ columns, values: [] });
  });

  const search = (aiIndexIds: string[], userId?: string) =>
    createAiIndexRecallStore({ list, query }).search({
      query: 'checkout',
      limit: 67,
      aiIndexIds,
      userId,
    });

  it('returns nothing when no AI index is readable', async () => {
    list.mockResolvedValue([]);

    expect(await search(['ops-memory'])).toEqual([]);
    expect(list).toHaveBeenCalledWith(['ops-memory']);
    expect(query).not.toHaveBeenCalled();
  });

  it('searches every readable AI index for *', async () => {
    list.mockResolvedValue([]);

    await search(['*']);

    expect(list).toHaveBeenCalledWith(undefined);
  });

  it('maps rows to results with their AI index', async () => {
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

    expect(await search(['ops-memory', 'ops-stream'])).toEqual([
      {
        id: 'ki-1',
        source: 'ai_index:ops-memory',
        content: 'pool limit',
        date: '2026-11-07T02:00:41Z',
      },
      { id: 'doc-2', source: 'ai_index:ops-stream', content: 'rolled back' },
    ]);
    expect(query).toHaveBeenCalledWith({
      query: buildAiIndexRecallQuery({
        dests: ['ai-index-idx-ops-memory', 'ai-index-ds-ops-stream'],
        limit: 67,
        filterByUser: false,
      }),
      params: { query: 'checkout' },
      limit: 67,
    });
  });

  it('filters by user_id when one is sent', async () => {
    list.mockResolvedValue([aiIndex('ops-memory', 'index', 'ai-index-idx-ops-memory')]);

    await search(['ops-memory'], 'jdoe');

    const [request] = query.mock.calls[0];
    expect(request.query).toContain('WHERE user_id IS NULL OR user_id == ?user_id');
    expect(request.params).toEqual({ query: 'checkout', user_id: 'jdoe' });
  });
});

describe('buildAiIndexRecallQuery', () => {
  const dest = { type: 'data_stream' as const, value: 'ai-index-ds-ops-stream' };
  const query = buildAiIndexRecallQuery({ dests: [dest.value], limit: 100, filterByUser: false });

  it('reads dreamed KIs only', () => {
    expect(query).toContain('WHERE STARTS_WITH(type, "fact.") OR STARTS_WITH(type, "entity.")');
  });

  it('builds a query the lifecycle pipeline accepts', () => {
    const withLifecycle = applyKiLifecycle(query, [dest]);

    expect(withLifecycle).toContain('governance.lifecycle.status');
    expect(withLifecycle).toContain('FORK');
    expect(withLifecycle).toContain('FUSE');
  });
});
