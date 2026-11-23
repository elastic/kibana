/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
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
  let search: jest.Mock;

  beforeEach(() => {
    list = jest.fn();
    query = jest.fn().mockResolvedValue({ columns, values: [] });
    search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
  });

  const recall = (aiIndexIds: string[]) =>
    createAiIndexRecallStore({
      esClient: { search } as unknown as ElasticsearchClient,
      dataReadService: { list, query },
    }).search({ query: 'checkout', limit: 67, userId: 'jdoe', aiIndexIds });

  it('returns nothing when no AI index is readable', async () => {
    list.mockResolvedValue([]);

    expect(await recall(['ops-memory'])).toEqual([]);
    expect(list).toHaveBeenCalledWith(['ops-memory']);
    expect(query).not.toHaveBeenCalled();
  });

  it('searches every readable AI index for *', async () => {
    list.mockResolvedValue([]);

    await recall(['*']);

    expect(list).toHaveBeenCalledWith(undefined);
  });

  it('maps rows to results with their AI index and attributes', async () => {
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
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _index: 'ai-index-idx-ops-memory',
            _id: 'doc-1',
            _source: { attributes: { owner: 'payments-team' } },
          },
        ],
      },
    });

    expect(await recall(['ops-memory', 'ops-stream'])).toEqual([
      {
        id: 'ki-1',
        source: 'ai_index:ops-memory',
        content: 'pool limit',
        date: '2026-11-07T02:00:41Z',
        attributes: { owner: 'payments-team' },
      },
      { id: 'doc-2', source: 'ai_index:ops-stream', content: 'rolled back' },
    ]);
    expect(query).toHaveBeenCalledWith({
      query: buildAiIndexRecallQuery({
        dests: ['ai-index-idx-ops-memory', 'ai-index-ds-ops-stream'],
        limit: 67,
      }),
      params: { query: 'checkout', user_id: 'jdoe' },
      limit: 67,
    });
    expect(search).toHaveBeenCalledWith({
      index: ['ai-index-idx-ops-memory', '.ds-ai-index-ds-ops-stream-2026.11.07-000001'],
      size: 4,
      _source: ['attributes'],
      query: { ids: { values: ['doc-1', 'doc-2'] } },
    });
  });
});

describe('buildAiIndexRecallQuery', () => {
  const dest = { type: 'data_stream' as const, value: 'ai-index-ds-ops-stream' };
  const query = buildAiIndexRecallQuery({ dests: [dest.value], limit: 100 });

  it("reads shared KIs and the user's own", () => {
    expect(query).toContain('WHERE user_id IS NULL OR user_id == ?user_id');
  });

  it('builds a query the lifecycle pipeline accepts', () => {
    const withLifecycle = applyKiLifecycle(query, [dest]);

    expect(withLifecycle).toContain('governance.lifecycle.status');
    expect(withLifecycle).toContain('FORK');
    expect(withLifecycle).toContain('FUSE');
  });
});
