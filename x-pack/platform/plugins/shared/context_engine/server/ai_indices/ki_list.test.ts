/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getKis } from './ki_list';

const BACKING_INDEX = 'ai-index-idx-sample';
const INDEX_DEST = { type: 'index' as const, value: BACKING_INDEX };
const DATA_STREAM_DEST = { type: 'data_stream' as const, value: 'ai-index-ds-sample' };

const probeResponse = (fields: string[]) => ({
  columns: fields.map((name) => ({ name })),
  values: [],
});
const ALL_FIELDS = [
  'id',
  '@timestamp',
  'updated_at',
  'type',
  'title',
  'governance.lifecycle.status',
];
const unknownIndexError = () =>
  new errors.ResponseError({
    statusCode: 400,
    body: { error: { type: 'verification_exception', reason: 'Unknown index [x]' } },
    warnings: [],
    meta: {} as never,
  });

const rowsResponse = (
  rows: Array<[string, string, string | null, string | null, string | null, string | null]>
) => ({
  columns: [
    { name: '_index' },
    { name: 'id' },
    { name: 'type' },
    { name: 'title' },
    { name: 'updated_at' },
    { name: 'lifecycle_status' },
  ],
  values: rows,
});
const rowsResponseWithExpiresAt = (
  rows: Array<
    [string, string, string | null, string | null, string | null, string | null, string | null]
  >
) => ({
  columns: [
    { name: '_index' },
    { name: 'id' },
    { name: 'type' },
    { name: 'title' },
    { name: 'updated_at' },
    { name: 'expires_at' },
    { name: 'lifecycle_status' },
  ],
  values: rows,
});
const FIELDS_WITH_EXPIRES_AT = [...ALL_FIELDS, 'expires_at'];
const totalsResponse = (total: number, filtered?: number) =>
  filtered === undefined
    ? { columns: [{ name: 'total' }], values: [[total]] }
    : { columns: [{ name: 'total' }, { name: 'filtered' }], values: [[total, filtered]] };
const bucketsResponse = (rows: Array<[number, string]>) => ({
  columns: [{ name: 'count' }, { name: 'type' }],
  values: rows,
});

describe('ki_list', () => {
  const query = jest.fn();
  const esClient = { esql: { query } } as unknown as ElasticsearchClient;

  // Call 0 is the schema probe; the numbered calls below are the list queries after it.
  const queryText = (call: number) => query.mock.calls[call + 1][0].query as string;

  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValueOnce(probeResponse(ALL_FIELDS));
  });

  it('returns the current revision of each KI with exact totals and all type buckets', async () => {
    query
      .mockResolvedValueOnce(
        rowsResponse([
          [
            BACKING_INDEX,
            'ki-1',
            'playbook',
            'Refund playbook',
            '2026-01-02T00:00:00.000Z',
            'active',
          ],
          [BACKING_INDEX, 'ki-2', 'policy', 'Refund policy', null, null],
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
        {
          id: 'ki-1',
          index: BACKING_INDEX,
          type: 'playbook',
          title: 'Refund playbook',
          updated_at: '2026-01-02T00:00:00.000Z',
          lifecycle_status: 'active',
        },
        {
          id: 'ki-2',
          index: BACKING_INDEX,
          type: 'policy',
          title: 'Refund policy',
          lifecycle_status: 'active',
        },
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
        'EVAL lifecycle_status = COALESCE(governance.lifecycle.status, "active")',
        'WHERE lifecycle_status != "deleted"',
        'EVAL expires_at = TO_STRING(NULL)',
        'SORT revision_time DESC, id ASC',
        'KEEP _index, id, type, title, updated_at, expires_at, lifecycle_status',
        'LIMIT 25',
      ].join('\n| ')
    );
    expect(queryText(1)).toContain('| STATS total = COUNT(*)');
    expect(queryText(2)).toContain(
      '| WHERE type IS NOT NULL\n| STATS count = COUNT(*) BY type\n| SORT count DESC, type ASC'
    );
    expect(queryText(2)).not.toContain('| LIMIT');
  });

  it('returns expired KIs without filtering on expires_at', async () => {
    query.mockReset();
    query
      .mockResolvedValueOnce(probeResponse(FIELDS_WITH_EXPIRES_AT))
      .mockResolvedValueOnce(
        rowsResponseWithExpiresAt([
          [
            BACKING_INDEX,
            'ki-expired',
            'memory.session',
            'Expired memory',
            null,
            '2020-01-01T00:00:00.000Z',
            'active',
          ],
        ])
      )
      .mockResolvedValueOnce(totalsResponse(1))
      .mockResolvedValueOnce(bucketsResponse([[1, 'memory.session']]));

    await expect(getKis(esClient, { dest: INDEX_DEST, size: 25 })).resolves.toEqual({
      total: 1,
      summary: { total: 1, counts_by_type: [{ type: 'memory.session', count: 1 }] },
      kis: [
        {
          id: 'ki-expired',
          index: BACKING_INDEX,
          type: 'memory.session',
          title: 'Expired memory',
          expires_at: '2020-01-01T00:00:00.000Z',
          lifecycle_status: 'active',
        },
      ],
    });

    expect(queryText(0)).toContain('KEEP _index, id, type, title, updated_at, expires_at');
    expect(queryText(0)).not.toMatch(/expires_at\s+IS\s+NULL/);
    expect(queryText(0)).not.toMatch(/expires_at\s+>/);
  });

  it('returns no KIs when lifecycleStatuses is empty', async () => {
    query
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await expect(
      getKis(esClient, { dest: INDEX_DEST, size: 25, lifecycleStatuses: [] })
    ).resolves.toEqual({
      total: 0,
      summary: { total: 0, counts_by_type: [] },
      kis: [],
    });

    expect(queryText(0)).toContain('WHERE FALSE');
  });

  it('lists only deleted KIs when lifecycleStatuses is deleted', async () => {
    query
      .mockResolvedValueOnce(
        rowsResponse([
          [BACKING_INDEX, 'ki-deleted', 'memory.session', 'Forgotten', null, 'deleted'],
        ])
      )
      .mockResolvedValueOnce(totalsResponse(1))
      .mockResolvedValueOnce(bucketsResponse([[1, 'memory.session']]));

    await expect(
      getKis(esClient, { dest: INDEX_DEST, size: 25, lifecycleStatuses: ['deleted'] })
    ).resolves.toEqual({
      total: 1,
      summary: { total: 1, counts_by_type: [{ type: 'memory.session', count: 1 }] },
      kis: [
        {
          id: 'ki-deleted',
          index: BACKING_INDEX,
          type: 'memory.session',
          title: 'Forgotten',
          lifecycle_status: 'deleted',
        },
      ],
    });

    expect(queryText(0)).toContain('WHERE lifecycle_status IN ("deleted")');
  });

  it('includes deleted KIs when lifecycleStatuses lists active and deleted', async () => {
    query
      .mockResolvedValueOnce(
        rowsResponse([
          [BACKING_INDEX, 'ki-deleted', 'memory.session', 'Forgotten', null, 'deleted'],
        ])
      )
      .mockResolvedValueOnce(totalsResponse(1))
      .mockResolvedValueOnce(bucketsResponse([[1, 'memory.session']]));

    await expect(
      getKis(esClient, {
        dest: INDEX_DEST,
        size: 25,
        lifecycleStatuses: ['active', 'deleted'],
      })
    ).resolves.toEqual({
      total: 1,
      summary: { total: 1, counts_by_type: [{ type: 'memory.session', count: 1 }] },
      kis: [
        {
          id: 'ki-deleted',
          index: BACKING_INDEX,
          type: 'memory.session',
          title: 'Forgotten',
          lifecycle_status: 'deleted',
        },
      ],
    });

    expect(queryText(0)).toContain('WHERE lifecycle_status IN ("active", "deleted")');
  });

  it('returns no KIs when deleted is requested but the index has no lifecycle field', async () => {
    query.mockReset();
    query.mockResolvedValueOnce(probeResponse(['id', '@timestamp', 'type', 'title']));
    query
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await expect(
      getKis(esClient, { dest: INDEX_DEST, size: 25, lifecycleStatuses: ['deleted'] })
    ).resolves.toEqual({
      total: 0,
      summary: { total: 0, counts_by_type: [] },
      kis: [],
    });

    expect(queryText(0)).toContain('EVAL lifecycle_status = "active"');
    expect(queryText(0)).toContain('WHERE lifecycle_status IN ("deleted")');
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

  it('probes each expression of a comma-separated dest and quotes them separately', async () => {
    query.mockReset();
    query
      .mockResolvedValueOnce(probeResponse(ALL_FIELDS))
      .mockResolvedValueOnce(probeResponse(ALL_FIELDS))
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await getKis(esClient, {
      dest: { type: 'index', value: 'ai-index-idx-a, ai-index-idx-b*' },
      size: 25,
    });

    expect(query.mock.calls[0][0].query).toBe(
      'FROM "ai-index-idx-a" METADATA _id, _index\n| LIMIT 0'
    );
    expect(query.mock.calls[1][0].query).toBe(
      'FROM "ai-index-idx-b*" METADATA _id, _index\n| LIMIT 0'
    );
    expect(query.mock.calls[2][0].query).toContain(
      'FROM "ai-index-idx-a", "ai-index-idx-b*" METADATA _id, _index'
    );
  });

  it('lists the expressions that exist when another one is missing', async () => {
    query.mockReset();
    query
      .mockResolvedValueOnce(probeResponse(ALL_FIELDS))
      .mockRejectedValueOnce(unknownIndexError())
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await getKis(esClient, {
      dest: { type: 'index', value: 'ai-index-idx-a,ai-index-idx-missing' },
      size: 25,
    });

    expect(query.mock.calls[2][0].query).toContain('FROM "ai-index-idx-a" METADATA _id, _index');
  });

  it('filters rows and the total by type but keeps unfiltered type counts', async () => {
    query
      .mockResolvedValueOnce(
        rowsResponse([[BACKING_INDEX, 'ki-1', 'playbook', 'Refund playbook', null, 'active']])
      )
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

    expect(query.mock.calls[1][0]).toEqual({
      query: expect.stringContaining('| WHERE type == ?type'),
      params: [{ type: 'playbook' }],
    });
    expect(query.mock.calls[2][0]).toEqual({
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
          [
            BACKING_INDEX,
            'ki-complete',
            'playbook',
            'Complete KI',
            '2026-01-01T00:00:00.000Z',
            'active',
          ],
          [BACKING_INDEX, 'ki-missing-type', null, 'Missing type', null, null],
          [BACKING_INDEX, 'ki-missing-title', 'policy', null, null, null],
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
        {
          id: 'ki-complete',
          index: BACKING_INDEX,
          type: 'playbook',
          title: 'Complete KI',
          updated_at: '2026-01-01T00:00:00.000Z',
          lifecycle_status: 'active',
        },
        {
          id: 'ki-missing-type',
          index: BACKING_INDEX,
          title: 'Missing type',
          lifecycle_status: 'active',
        },
        {
          id: 'ki-missing-title',
          index: BACKING_INDEX,
          type: 'policy',
          lifecycle_status: 'active',
        },
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

    expect(query).toHaveBeenCalledTimes(3);
    expect(queryText(0)).toContain('| STATS total = COUNT(*)');
  });

  it('normalizes lifecycle to active and excludes deleted when fields are missing on the index', async () => {
    query.mockReset();
    query.mockResolvedValueOnce(probeResponse(['type', 'title']));
    query
      .mockResolvedValueOnce(
        rowsResponse([[BACKING_INDEX, 'ki-1', 'dashboard', 'Sales', null, 'active']])
      )
      .mockResolvedValueOnce(totalsResponse(1))
      .mockResolvedValueOnce(bucketsResponse([[1, 'dashboard']]));

    await expect(getKis(esClient, { dest: INDEX_DEST, size: 25 })).resolves.toEqual(
      expect.objectContaining({
        kis: [
          {
            id: 'ki-1',
            index: BACKING_INDEX,
            type: 'dashboard',
            title: 'Sales',
            lifecycle_status: 'active',
          },
        ],
      })
    );

    expect(queryText(0)).toBe(
      [
        `FROM "${BACKING_INDEX}" METADATA _id, _index`,
        'EVAL id = _id',
        'EVAL lifecycle_status = "active"',
        'WHERE lifecycle_status != "deleted"',
        'EVAL updated_at = TO_STRING(NULL)',
        'EVAL expires_at = TO_STRING(NULL)',
        'SORT id ASC',
        'KEEP _index, id, type, title, updated_at, expires_at, lifecycle_status',
        'LIMIT 25',
      ].join('\n| ')
    );
  });

  it('returns an empty list when the backing store does not exist', async () => {
    query.mockReset();
    query.mockRejectedValueOnce(unknownIndexError());

    await expect(
      getKis(esClient, { dest: { type: 'index', value: 'ai-index-idx-missing' }, size: 25 })
    ).resolves.toEqual({ kis: [], total: 0, summary: { total: 0, counts_by_type: [] } });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0].query).toBe(
      'FROM "ai-index-idx-missing" METADATA _id, _index\n| LIMIT 0'
    );
  });

  it('rethrows probe failures other than a missing index', async () => {
    query.mockReset();
    const cause = new Error('boom');
    query.mockRejectedValueOnce(cause);

    await expect(getKis(esClient, { dest: INDEX_DEST, size: 25 })).rejects.toBe(cause);
  });
});
