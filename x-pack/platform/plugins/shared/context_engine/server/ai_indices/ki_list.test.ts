/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getKis } from './ki_list';

const BACKING_INDEX = 'ai-index-idx-sample';
const INDEX_DEST = { type: 'index' as const, value: BACKING_INDEX };
const DATA_STREAM_DEST = { type: 'data_stream' as const, value: 'ai-index-ds-sample' };

const fieldCapsFor = (fields: string[]) => ({
  indices: [BACKING_INDEX],
  fields: Object.fromEntries(fields.map((f) => [f, { keyword: { type: 'keyword' } }])),
});
const ALL_FIELDS = ['id', '@timestamp', 'type', 'title', 'governance.lifecycle.status'];

const rowsResponse = (rows: Array<[string, string, string | null, string | null]>) => ({
  columns: [{ name: '_index' }, { name: 'id' }, { name: 'type' }, { name: 'title' }],
  values: rows,
});
const totalsResponse = (total: number, filtered?: number) =>
  filtered === undefined
    ? { columns: [{ name: 'total' }], values: [[total]] }
    : { columns: [{ name: 'total' }, { name: 'filtered' }], values: [[total, filtered]] };
const bucketsResponse = (rows: Array<[number, string]>) => ({
  columns: [{ name: 'count' }, { name: 'type' }],
  values: rows,
});

describe('ki_list', () => {
  const fieldCaps = jest.fn();
  const query = jest.fn();
  const esClient = { fieldCaps, esql: { query } } as unknown as ElasticsearchClient;

  const queryText = (call: number) => query.mock.calls[call][0].query as string;

  beforeEach(() => {
    fieldCaps.mockReset();
    query.mockReset();
    fieldCaps.mockResolvedValue(fieldCapsFor(ALL_FIELDS));
  });

  it('returns the current revision of each KI with exact totals and capped type buckets', async () => {
    query
      .mockResolvedValueOnce(
        rowsResponse([
          [BACKING_INDEX, 'ki-1', 'playbook', 'Refund playbook'],
          [BACKING_INDEX, 'ki-2', 'policy', 'Refund policy'],
        ])
      )
      .mockResolvedValueOnce(totalsResponse(6))
      .mockResolvedValueOnce(
        bucketsResponse([
          [4, 'faq'],
          [1, 'playbook'],
          [1, 'policy'],
        ])
      );

    await expect(getKis(esClient, { dest: INDEX_DEST, size: 25 })).resolves.toEqual({
      total: 6,
      summary: {
        total: 6,
        counts_by_type: [
          { type: 'faq', count: 4 },
          { type: 'playbook', count: 1 },
          { type: 'policy', count: 1 },
        ],
      },
      kis: [
        { id: 'ki-1', index: BACKING_INDEX, type: 'playbook', title: 'Refund playbook' },
        { id: 'ki-2', index: BACKING_INDEX, type: 'policy', title: 'Refund policy' },
      ],
    });

    expect(queryText(0)).toBe(
      [
        `FROM "${BACKING_INDEX}" METADATA _id, _index`,
        'EVAL id = COALESCE(id, _id)',
        'EVAL revision_time = COALESCE(@timestamp, TO_DATETIME("1970-01-01T00:00:00Z"))',
        'INLINE STATS latest = MAX(revision_time) BY _index, id',
        'WHERE revision_time == latest',
        'INLINE STATS latest_doc = MAX(_id) BY _index, id',
        'WHERE _id == latest_doc',
        'WHERE governance.lifecycle.status IS NULL OR governance.lifecycle.status != "deleted"',
        'SORT revision_time DESC, id ASC',
        'KEEP _index, id, type, title',
        'LIMIT 25',
      ].join('\n| ')
    );
    expect(queryText(1)).toContain('| STATS total = COUNT(*)');
    expect(queryText(2)).toContain(
      '| WHERE type IS NOT NULL\n| STATS count = COUNT(*) BY type\n| SORT count DESC, type ASC\n| LIMIT 5'
    );
  });

  it('collapses revisions by id alone on a data stream', async () => {
    query
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await getKis(esClient, { dest: DATA_STREAM_DEST, size: 25 });

    expect(queryText(0)).toContain('| INLINE STATS latest = MAX(revision_time) BY id\n');
    expect(queryText(0)).toContain('| INLINE STATS latest_doc = MAX(_id) BY id\n');
  });

  it('quotes each expression of a comma-separated dest separately', async () => {
    query
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await getKis(esClient, {
      dest: { type: 'index', value: 'ai-index-idx-a, ai-index-idx-b*' },
      size: 25,
    });

    expect(queryText(0)).toContain('FROM "ai-index-idx-a", "ai-index-idx-b*" METADATA _id, _index');
  });

  it('filters rows and the total by type but keeps unfiltered type counts', async () => {
    query
      .mockResolvedValueOnce(rowsResponse([[BACKING_INDEX, 'ki-1', 'playbook', 'Refund playbook']]))
      .mockResolvedValueOnce(totalsResponse(5, 1))
      .mockResolvedValueOnce(
        bucketsResponse([
          [4, 'faq'],
          [1, 'playbook'],
        ])
      );

    await expect(
      getKis(esClient, { dest: INDEX_DEST, size: 10, type: 'playbook' })
    ).resolves.toEqual(
      expect.objectContaining({
        total: 1,
        summary: {
          total: 5,
          counts_by_type: [
            { type: 'faq', count: 4 },
            { type: 'playbook', count: 1 },
          ],
        },
      })
    );

    expect(query.mock.calls[0][0]).toEqual({
      query: expect.stringContaining('| WHERE type == ?type'),
      params: [{ type: 'playbook' }],
    });
    expect(query.mock.calls[1][0]).toEqual({
      query: expect.stringContaining(
        '| STATS total = COUNT(*), filtered = COUNT(*) WHERE type == ?type'
      ),
      params: [{ type: 'playbook' }],
    });
    expect(queryText(2)).not.toContain('?type');
  });

  it('includes KIs with missing type or title so total matches the rendered row count', async () => {
    query
      .mockResolvedValueOnce(
        rowsResponse([
          [BACKING_INDEX, 'ki-complete', 'playbook', 'Complete KI'],
          [BACKING_INDEX, 'ki-missing-type', null, 'Missing type'],
          [BACKING_INDEX, 'ki-missing-title', 'policy', null],
        ])
      )
      .mockResolvedValueOnce(totalsResponse(3))
      .mockResolvedValueOnce(
        bucketsResponse([
          [1, 'playbook'],
          [1, 'policy'],
        ])
      );

    await expect(getKis(esClient, { dest: INDEX_DEST, size: 25 })).resolves.toEqual({
      total: 3,
      summary: {
        total: 3,
        counts_by_type: [
          { type: 'playbook', count: 1 },
          { type: 'policy', count: 1 },
        ],
      },
      kis: [
        { id: 'ki-complete', index: BACKING_INDEX, type: 'playbook', title: 'Complete KI' },
        { id: 'ki-missing-type', index: BACKING_INDEX, title: 'Missing type' },
        { id: 'ki-missing-title', index: BACKING_INDEX, type: 'policy' },
      ],
    });
  });

  it('returns summary stats without fetching rows when size is 0', async () => {
    query
      .mockResolvedValueOnce(totalsResponse(6))
      .mockResolvedValueOnce(bucketsResponse([[6, 'faq']]));

    await expect(getKis(esClient, { dest: INDEX_DEST, size: 0 })).resolves.toEqual({
      kis: [],
      total: 6,
      summary: { total: 6, counts_by_type: [{ type: 'faq', count: 6 }] },
    });

    expect(query).toHaveBeenCalledTimes(2);
    expect(queryText(0)).toContain('| STATS total = COUNT(*)');
  });

  it('omits the revision collapse and lifecycle filter for indices without those fields', async () => {
    fieldCaps.mockResolvedValue(fieldCapsFor(['type', 'title']));
    query
      .mockResolvedValueOnce(rowsResponse([[BACKING_INDEX, 'ki-1', 'dashboard', 'Sales']]))
      .mockResolvedValueOnce(totalsResponse(1))
      .mockResolvedValueOnce(bucketsResponse([[1, 'dashboard']]));

    await getKis(esClient, { dest: INDEX_DEST, size: 25 });

    expect(queryText(0)).toBe(
      [
        `FROM "${BACKING_INDEX}" METADATA _id, _index`,
        'EVAL id = _id',
        'SORT id ASC',
        'KEEP _index, id, type, title',
        'LIMIT 25',
      ].join('\n| ')
    );
  });

  it('returns an empty list when the backing store does not exist', async () => {
    fieldCaps.mockResolvedValue({ indices: [], fields: {} });

    await expect(
      getKis(esClient, { dest: { type: 'index', value: 'ai-index-idx-missing' }, size: 25 })
    ).resolves.toEqual({ kis: [], total: 0, summary: { total: 0, counts_by_type: [] } });

    expect(fieldCaps).toHaveBeenCalledWith({
      index: 'ai-index-idx-missing',
      fields: ['id', '@timestamp', 'type', 'title', 'governance.lifecycle.status'],
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    expect(query).not.toHaveBeenCalled();
  });
});
