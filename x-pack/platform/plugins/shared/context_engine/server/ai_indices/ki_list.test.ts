/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getKiGroups, getKis, probeColumns } from './ki_list';

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
    { name: 'ki_status' },
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
    { name: 'ki_status' },
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

  it('returns the current revision of each KI with exact totals and capped type buckets', async () => {
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
          [BACKING_INDEX, 'ki-2', 'policy', 'Refund policy', null, 'active'],
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
          status: 'active',
        },
        {
          id: 'ki-2',
          index: BACKING_INDEX,
          type: 'policy',
          title: 'Refund policy',
          status: 'active',
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
        'EVAL ki_status = CASE(lifecycle_status == "active" AND COALESCE(false, false), "expired", lifecycle_status)',
        'WHERE lifecycle_status != "deleted"',
        'EVAL type = MV_MIN(type)',
        'EVAL type = CASE(type == "", NULL, type)',
        'EVAL expires_at = TO_STRING(NULL)',
        'EVAL updated_sort = COALESCE(TO_DATETIME(updated_at), revision_time)',
        'SORT updated_sort DESC, id ASC',
        'KEEP _index, id, type, title, updated_at, expires_at, ki_status',
        'LIMIT 25',
      ].join('\n| ')
    );
    expect(queryText(1)).toContain('| STATS total = COUNT(*)');
    expect(queryText(2)).toContain(
      '| WHERE type IS NOT NULL AND BYTE_LENGTH(type) <= 256\n| STATS count = COUNT(*) BY type\n| SORT count DESC, type ASC\n| LIMIT 5'
    );
  });

  it('sets type to null when the index has no type column', async () => {
    query.mockReset();
    query
      .mockResolvedValueOnce(probeResponse(['id', '@timestamp', 'title']))
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await getKis(esClient, { dest: INDEX_DEST, size: 25 });

    expect(queryText(0)).toContain('| EVAL type = TO_STRING(NULL)\n');
    expect(queryText(0)).not.toContain('MV_MIN');
  });

  it('returns no type for a row whose type is an empty string', async () => {
    query
      .mockResolvedValueOnce(
        rowsResponse([[BACKING_INDEX, 'ki-1', '', 'Empty type', null, 'active']])
      )
      .mockResolvedValueOnce(totalsResponse(1))
      .mockResolvedValueOnce(bucketsResponse([]));

    const { kis } = await getKis(esClient, { dest: INDEX_DEST, size: 25 });

    expect(kis).toEqual([
      { id: 'ki-1', index: BACKING_INDEX, title: 'Empty type', status: 'active' },
    ]);
  });

  // The AI briefing reads `summary.counts_by_type`, so this also keeps `""` out of the briefing.
  it('builds type counts only from groupable types', async () => {
    query
      .mockResolvedValueOnce(totalsResponse(3))
      .mockResolvedValueOnce(bucketsResponse([[1, 'faq']]));

    await getKis(esClient, { dest: INDEX_DEST, size: 0 });

    const bucketsQuery = queryText(1);
    expect(bucketsQuery).toContain('| EVAL type = CASE(type == "", NULL, type)\n');
    expect(bucketsQuery).toContain('| WHERE type IS NOT NULL AND BYTE_LENGTH(type) <= 256\n');
  });

  describe('excludeTypes', () => {
    const OTHER = '(type IS NULL OR type NOT IN (?excludeType0, ?excludeType1))';

    it('filters rows and the total to other types, keeps KIs without a type, and leaves the summary alone', async () => {
      query
        .mockResolvedValueOnce(
          rowsResponse([[BACKING_INDEX, 'ki-1', null, 'No type', null, 'active']])
        )
        .mockResolvedValueOnce(totalsResponse(9, 2))
        .mockResolvedValueOnce(bucketsResponse([[7, 'faq']]));

      await expect(
        getKis(esClient, { dest: INDEX_DEST, size: 25, excludeTypes: ['faq', 'policy'] })
      ).resolves.toEqual(
        expect.objectContaining({
          total: 2,
          summary: { total: 9, counts_by_type: [{ type: 'faq', count: 7 }] },
        })
      );

      const params = [{ excludeType0: 'faq' }, { excludeType1: 'policy' }];
      expect(query.mock.calls[1][0]).toEqual({
        query: expect.stringContaining(`| WHERE ${OTHER}\n`),
        params,
      });
      expect(query.mock.calls[2][0]).toEqual({
        query: expect.stringContaining(
          `| STATS total = COUNT(*), filtered = COUNT(*) WHERE ${OTHER}`
        ),
        params,
      });
      expect(query.mock.calls[3][0]).not.toHaveProperty('params');
    });

    it('applies type and excludeTypes together', async () => {
      query
        .mockResolvedValueOnce(rowsResponse([]))
        .mockResolvedValueOnce(totalsResponse(9, 0))
        .mockResolvedValueOnce(bucketsResponse([]));

      await getKis(esClient, {
        dest: INDEX_DEST,
        size: 25,
        type: 'faq',
        excludeTypes: ['faq', 'policy'],
      });

      expect(query.mock.calls[1][0]).toEqual({
        query: expect.stringContaining(`| WHERE type == ?type AND ${OTHER}\n`),
        params: [{ type: 'faq' }, { excludeType0: 'faq' }, { excludeType1: 'policy' }],
      });
    });

    it('adds no filter for an empty list', async () => {
      query
        .mockResolvedValueOnce(rowsResponse([]))
        .mockResolvedValueOnce(totalsResponse(0))
        .mockResolvedValueOnce(bucketsResponse([]));

      await getKis(esClient, { dest: INDEX_DEST, size: 25, excludeTypes: [] });

      expect(queryText(0)).not.toContain('NOT IN');
      expect(queryText(1)).not.toContain('filtered');
    });
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
            'expired',
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
          status: 'expired',
        },
      ],
    });

    expect(queryText(0)).toContain('KEEP _index, id, type, title, updated_at, expires_at');
    expect(queryText(0)).not.toMatch(/expires_at\s+IS\s+NULL/);
    expect(queryText(0)).not.toMatch(/expires_at\s+>/);
  });

  it('returns no KIs when statuses is empty', async () => {
    query
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await expect(getKis(esClient, { dest: INDEX_DEST, size: 25, statuses: [] })).resolves.toEqual({
      total: 0,
      summary: { total: 0, counts_by_type: [] },
      kis: [],
    });

    expect(queryText(0)).toContain('WHERE FALSE');
  });

  it('lists only deleted KIs when statuses is deleted', async () => {
    query
      .mockResolvedValueOnce(
        rowsResponse([
          [BACKING_INDEX, 'ki-deleted', 'memory.session', 'Forgotten', null, 'deleted'],
        ])
      )
      .mockResolvedValueOnce(totalsResponse(1))
      .mockResolvedValueOnce(bucketsResponse([[1, 'memory.session']]));

    await expect(
      getKis(esClient, { dest: INDEX_DEST, size: 25, statuses: ['deleted'] })
    ).resolves.toEqual({
      total: 1,
      summary: { total: 1, counts_by_type: [{ type: 'memory.session', count: 1 }] },
      kis: [
        {
          id: 'ki-deleted',
          index: BACKING_INDEX,
          type: 'memory.session',
          title: 'Forgotten',
          status: 'deleted',
        },
      ],
    });

    expect(queryText(0)).toContain('WHERE ki_status IN ("deleted")');
  });

  it('includes deleted KIs when statuses lists active and deleted', async () => {
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
        statuses: ['active', 'deleted'],
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
          status: 'deleted',
        },
      ],
    });

    expect(queryText(0)).toContain('WHERE ki_status IN ("active", "deleted")');
  });

  it('returns no KIs when deleted is requested but the index has no lifecycle field', async () => {
    query.mockReset();
    query.mockResolvedValueOnce(probeResponse(['id', '@timestamp', 'type', 'title']));
    query
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await expect(
      getKis(esClient, { dest: INDEX_DEST, size: 25, statuses: ['deleted'] })
    ).resolves.toEqual({
      total: 0,
      summary: { total: 0, counts_by_type: [] },
      kis: [],
    });

    expect(queryText(0)).toContain('EVAL lifecycle_status = "active"');
    expect(queryText(0)).toContain('WHERE ki_status IN ("deleted")');
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
          [BACKING_INDEX, 'ki-missing-type', null, 'Missing type', null, 'active'],
          [BACKING_INDEX, 'ki-missing-title', 'policy', null, null, 'active'],
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
          status: 'active',
        },
        {
          id: 'ki-missing-type',
          index: BACKING_INDEX,
          title: 'Missing type',
          status: 'active',
        },
        {
          id: 'ki-missing-title',
          index: BACKING_INDEX,
          type: 'policy',
          status: 'active',
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
            status: 'active',
          },
        ],
      })
    );

    expect(queryText(0)).toBe(
      [
        `FROM "${BACKING_INDEX}" METADATA _id, _index`,
        'EVAL id = _id',
        'EVAL lifecycle_status = "active"',
        'EVAL ki_status = CASE(lifecycle_status == "active" AND COALESCE(false, false), "expired", lifecycle_status)',
        'WHERE lifecycle_status != "deleted"',
        'EVAL type = MV_MIN(type)',
        'EVAL type = CASE(type == "", NULL, type)',
        'EVAL updated_at = TO_STRING(NULL)',
        'EVAL expires_at = TO_STRING(NULL)',
        'SORT id ASC',
        'KEEP _index, id, type, title, updated_at, expires_at, ki_status',
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

  describe('status filter', () => {
    const emptyResponses = () =>
      query
        .mockResolvedValueOnce(rowsResponse([]))
        .mockResolvedValueOnce(totalsResponse(0))
        .mockResolvedValueOnce(bucketsResponse([]));

    it('computes the status but filters the default list on the stored status', async () => {
      emptyResponses();

      await getKis(esClient, { dest: INDEX_DEST, size: 25 });

      expect(queryText(0)).toContain('EVAL ki_status = ');
      expect(queryText(0)).toContain('| WHERE lifecycle_status != "deleted"');
      expect(queryText(0)).not.toContain('WHERE ki_status');
    });

    it('filters expired KIs on the computed status, only active KIs can expire', async () => {
      query.mockReset();
      query.mockResolvedValueOnce(probeResponse(FIELDS_WITH_EXPIRES_AT));
      emptyResponses();

      await getKis(esClient, { dest: INDEX_DEST, size: 25, statuses: ['expired'] });

      expect(queryText(0)).toContain(
        [
          'EVAL lifecycle_status = COALESCE(governance.lifecycle.status, "active")',
          'EVAL ki_status = CASE(lifecycle_status == "active" AND COALESCE(expires_at <= NOW(), false), "expired", lifecycle_status)',
          'WHERE ki_status IN ("expired")',
        ].join('\n| ')
      );
      expect(queryText(1)).toContain('WHERE ki_status IN ("expired")');
      expect(queryText(2)).toContain('WHERE ki_status IN ("expired")');
    });

    it('filters on active and expired together', async () => {
      query.mockReset();
      query.mockResolvedValueOnce(probeResponse(FIELDS_WITH_EXPIRES_AT));
      emptyResponses();

      await getKis(esClient, {
        dest: INDEX_DEST,
        size: 25,
        statuses: ['active', 'expired'],
      });

      expect(queryText(0)).toContain('WHERE ki_status IN ("active", "expired")');
    });

    it('filters on all four statuses', async () => {
      query.mockReset();
      query.mockResolvedValueOnce(probeResponse(FIELDS_WITH_EXPIRES_AT));
      emptyResponses();

      await getKis(esClient, {
        dest: INDEX_DEST,
        size: 25,
        statuses: ['active', 'deleted', 'verification_failed', 'expired'],
      });

      expect(queryText(0)).toContain(
        'WHERE ki_status IN ("active", "deleted", "verification_failed", "expired")'
      );
    });

    it('excludes expired KIs from active because the filter uses the computed status', async () => {
      query.mockReset();
      query.mockResolvedValueOnce(probeResponse(FIELDS_WITH_EXPIRES_AT));
      emptyResponses();

      await getKis(esClient, { dest: INDEX_DEST, size: 25, statuses: ['active'] });

      expect(queryText(0)).toContain('"expired", lifecycle_status)');
      expect(queryText(0)).toContain('WHERE ki_status IN ("active")');
      expect(queryText(0)).not.toContain('WHERE lifecycle_status IN');
    });

    it('never expires a KI when the index has no expires_at column', async () => {
      emptyResponses();

      await getKis(esClient, { dest: INDEX_DEST, size: 25, statuses: ['expired'] });

      expect(queryText(0)).toContain(
        'EVAL ki_status = CASE(lifecycle_status == "active" AND COALESCE(false, false), "expired", lifecycle_status)'
      );
      expect(queryText(0)).not.toContain('NOW()');
      expect(queryText(0).indexOf('EVAL ki_status')).toBeLessThan(
        queryText(0).indexOf('EVAL expires_at = TO_STRING(NULL)')
      );
    });

    it('returns only the computed status, not the stored lifecycle status', async () => {
      query.mockReset();
      query
        .mockResolvedValueOnce(probeResponse(FIELDS_WITH_EXPIRES_AT))
        .mockResolvedValueOnce(
          rowsResponseWithExpiresAt([
            [
              BACKING_INDEX,
              'ki-expired',
              'faq',
              'Old',
              null,
              '2020-01-01T00:00:00.000Z',
              'expired',
            ],
          ])
        )
        .mockResolvedValueOnce(totalsResponse(1))
        .mockResolvedValueOnce(bucketsResponse([[1, 'faq']]));

      const { kis } = await getKis(esClient, {
        dest: INDEX_DEST,
        size: 25,
        statuses: ['expired'],
      });

      expect(kis).toEqual([expect.objectContaining({ status: 'expired' })]);
      expect(kis[0]).not.toHaveProperty('lifecycle_status');
      expect(queryText(0)).toContain(
        'KEEP _index, id, type, title, updated_at, expires_at, ki_status'
      );
    });
  });

  describe('sort', () => {
    const emptyResponses = () =>
      query
        .mockResolvedValueOnce(rowsResponse([]))
        .mockResolvedValueOnce(totalsResponse(0))
        .mockResolvedValueOnce(bucketsResponse([]));

    it('sorts by lowercased title with missing titles last, after the type filter', async () => {
      emptyResponses();

      await getKis(esClient, { dest: INDEX_DEST, size: 25, type: 'faq', sort: 'title' });

      expect(queryText(0)).toContain(
        [
          'WHERE type == ?type',
          'EVAL title_sort = CASE(title == "", NULL, TO_LOWER(title))',
          'SORT title_sort ASC NULLS LAST, id ASC',
          'KEEP _index, id, type, title, updated_at, expires_at, ki_status',
          'LIMIT 25',
        ].join('\n| ')
      );
      expect(queryText(0)).not.toContain('updated_sort');
      expect(queryText(1)).not.toContain('title_sort');
      expect(queryText(2)).not.toContain('title_sort');
    });

    it('sorts by title when the index has no title column', async () => {
      query.mockReset();
      query.mockResolvedValueOnce(probeResponse(['id', '@timestamp', 'type']));
      emptyResponses();

      await getKis(esClient, { dest: INDEX_DEST, size: 25, sort: 'title' });

      expect(queryText(0)).toContain(
        [
          'EVAL title = TO_STRING(NULL)',
          'EVAL updated_at = TO_STRING(NULL)',
          'EVAL expires_at = TO_STRING(NULL)',
          'EVAL title_sort = CASE(title == "", NULL, TO_LOWER(title))',
          'SORT title_sort ASC NULLS LAST, id ASC',
        ].join('\n| ')
      );
    });

    it('sorts by updated_at newest first, falling back to the revision timestamp', async () => {
      emptyResponses();

      await getKis(esClient, { dest: INDEX_DEST, size: 25, sort: 'updated' });

      expect(queryText(0)).toContain(
        [
          'EVAL updated_sort = COALESCE(TO_DATETIME(updated_at), revision_time)',
          'SORT updated_sort DESC, id ASC',
          'KEEP',
        ].join('\n| ')
      );
      expect(queryText(0)).not.toContain('title_sort');
    });

    it('sorts by updated_at with missing dates last when the index has no timestamp column', async () => {
      query.mockReset();
      query.mockResolvedValueOnce(probeResponse(['id', 'updated_at', 'type']));
      emptyResponses();

      await getKis(esClient, { dest: INDEX_DEST, size: 25 });

      expect(queryText(0)).toContain(
        [
          'EVAL updated_sort = TO_DATETIME(updated_at)',
          'SORT updated_sort DESC NULLS LAST, id ASC',
        ].join('\n| ')
      );
    });

    it('sorts by the revision timestamp when the index has no updated_at column', async () => {
      query.mockReset();
      query.mockResolvedValueOnce(probeResponse(['id', '@timestamp', 'type']));
      emptyResponses();

      await getKis(esClient, { dest: INDEX_DEST, size: 25 });

      expect(queryText(0)).toContain('| SORT revision_time DESC, id ASC\n| KEEP');
      expect(queryText(0)).not.toContain('updated_sort');
    });

    it('sorts by id when the index has no timestamp column', async () => {
      query.mockReset();
      query.mockResolvedValueOnce(probeResponse(['type', 'title']));
      emptyResponses();

      await getKis(esClient, { dest: INDEX_DEST, size: 25 });

      expect(queryText(0)).toContain('| SORT id ASC\n| KEEP');
    });

    it('ranks by best match first, then the updated sort, when a search query is set', async () => {
      query.mockReset();
      query.mockResolvedValueOnce(probeResponse([...ALL_FIELDS, 'description']));
      emptyResponses();

      await getKis(esClient, { dest: INDEX_DEST, size: 25, query: 'refund' });

      expect(queryText(0)).toContain('| SORT _score DESC, updated_sort DESC, id ASC\n| KEEP');
    });
  });

  describe('probeColumns', () => {
    it('passes request options to the query', async () => {
      await expect(
        probeColumns(esClient, BACKING_INDEX, { requestTimeout: 30_000 })
      ).resolves.toEqual(ALL_FIELDS);

      expect(query).toHaveBeenCalledWith(
        { query: `FROM "${BACKING_INDEX}" METADATA _id, _index\n| LIMIT 0` },
        { requestTimeout: 30_000 }
      );
    });

    it('resolves undefined for a missing index', async () => {
      query.mockReset();
      query.mockRejectedValueOnce(unknownIndexError());

      await expect(probeColumns(esClient, BACKING_INDEX)).resolves.toBeUndefined();
    });

    it('rethrows other errors', async () => {
      query.mockReset();
      const cause = new Error('boom');
      query.mockRejectedValueOnce(cause);

      await expect(probeColumns(esClient, BACKING_INDEX)).rejects.toBe(cause);
    });
  });

  it('filters rows and totals with fuzzy MATCH on title and description', async () => {
    query.mockReset();
    query
      .mockResolvedValueOnce(probeResponse([...ALL_FIELDS, 'description']))
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await getKis(esClient, { dest: INDEX_DEST, size: 10, query: 'refund' });

    expect(query.mock.calls[1][0]).toEqual({
      query: expect.stringContaining(
        'WHERE (MATCH(title, ?searchQuery, {"fuzziness":"AUTO", "boost": 2}) OR MATCH(description, ?searchQuery, {"fuzziness":"AUTO"}))'
      ),
      params: [{ searchQuery: 'refund' }],
    });
    expect(queryText(0)).toContain('METADATA _id, _index, _score\n');
    expect(queryText(0)).toContain('SORT _score DESC, updated_sort DESC, id ASC');
    expect(queryText(1)).toContain(
      'WHERE (MATCH(title, ?searchQuery, {"fuzziness":"AUTO", "boost": 2}) OR MATCH(description, ?searchQuery, {"fuzziness":"AUTO"}))'
    );
    expect(queryText(2)).toContain(
      'WHERE (MATCH(title, ?searchQuery, {"fuzziness":"AUTO", "boost": 2}) OR MATCH(description, ?searchQuery, {"fuzziness":"AUTO"}))'
    );
    expect(query.mock.calls[3][0]).toEqual({
      query: expect.stringContaining('| STATS count = COUNT(*) BY type'),
      params: [{ searchQuery: 'refund' }],
    });
  });

  it('ranks by best match first, then title, when a search query is set', async () => {
    query.mockReset();
    query
      .mockResolvedValueOnce(probeResponse([...ALL_FIELDS, 'description']))
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await getKis(esClient, { dest: INDEX_DEST, size: 10, query: 'refund', sort: 'title' });

    expect(queryText(0)).toContain(
      '| EVAL title_sort = CASE(title == "", NULL, TO_LOWER(title))\n| SORT _score DESC, title_sort ASC NULLS LAST, id ASC\n| KEEP'
    );
  });

  it('binds type and search params together on rows and totals', async () => {
    query.mockReset();
    query
      .mockResolvedValueOnce(probeResponse(ALL_FIELDS))
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0, 0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await getKis(esClient, {
      dest: INDEX_DEST,
      size: 10,
      type: 'playbook',
      query: 'refund',
    });

    expect(query.mock.calls[1][0]).toEqual({
      query: expect.stringContaining('| WHERE type == ?type'),
      params: [{ type: 'playbook' }, { searchQuery: 'refund' }],
    });
    expect(query.mock.calls[2][0].params).toEqual([
      { type: 'playbook' },
      { searchQuery: 'refund' },
    ]);
    expect(query.mock.calls[3][0]).toEqual({
      query: expect.stringContaining('| STATS count = COUNT(*) BY type'),
      params: [{ searchQuery: 'refund' }],
    });
    expect(queryText(2)).not.toContain('?type');
  });

  it('returns no rows when search is set but title and description are absent', async () => {
    query.mockReset();
    query.mockResolvedValueOnce(probeResponse(['id', '@timestamp', 'type']));
    query
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(totalsResponse(0))
      .mockResolvedValueOnce(bucketsResponse([]));

    await expect(
      getKis(esClient, { dest: INDEX_DEST, size: 25, query: 'anything' })
    ).resolves.toEqual({
      total: 0,
      summary: { total: 0, counts_by_type: [] },
      kis: [],
    });

    expect(queryText(0)).toContain('WHERE FALSE');
    expect(queryText(0)).not.toContain('MATCH(');
  });
});

describe('getKiGroups', () => {
  const query = jest.fn();
  const esClient = { esql: { query } } as unknown as ElasticsearchClient;
  const queryText = (call: number) => query.mock.calls[call + 1][0].query as string;
  const OPTIONS = { dest: INDEX_DEST, maxGroups: 5, previewSize: 3 };

  const groupBucketsResponse = (rows: Array<[number, string | null, number, boolean]>) => ({
    columns: [{ name: 'count' }, { name: 'group_type' }, { name: 'total' }, { name: 'is_other' }],
    values: rows,
  });

  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValueOnce(probeResponse(ALL_FIELDS));
  });

  it('returns the biggest types with their first KIs and counts the rest as other', async () => {
    query
      .mockResolvedValueOnce(
        groupBucketsResponse([
          [4, 'faq', 7, false],
          [2, 'policy', 7, false],
        ])
      )
      .mockResolvedValueOnce(
        rowsResponse([[BACKING_INDEX, 'ki-1', 'faq', 'Refunds', null, 'active']])
      )
      .mockResolvedValueOnce(
        rowsResponse([[BACKING_INDEX, 'ki-2', 'policy', 'Returns', null, 'active']])
      );

    await expect(getKiGroups(esClient, OPTIONS)).resolves.toEqual({
      total: 7,
      total_other: 1,
      groups: [
        {
          type: 'faq',
          count: 4,
          kis: [
            { id: 'ki-1', index: BACKING_INDEX, type: 'faq', title: 'Refunds', status: 'active' },
          ],
        },
        {
          type: 'policy',
          count: 2,
          kis: [
            {
              id: 'ki-2',
              index: BACKING_INDEX,
              type: 'policy',
              title: 'Returns',
              status: 'active',
            },
          ],
        },
      ],
    });

    expect(queryText(0)).toContain(
      [
        'EVAL type = MV_MIN(type)',
        'EVAL type = CASE(type == "", NULL, type)',
        'EVAL expires_at = TO_STRING(NULL)',
        'EVAL group_type = CASE(type IS NOT NULL AND BYTE_LENGTH(type) <= 256, type, NULL)',
        'STATS count = COUNT(*) BY group_type',
        'INLINE STATS total = SUM(count)',
        'EVAL is_other = group_type IS NULL',
        'SORT is_other ASC, count DESC, group_type ASC',
        'LIMIT 5',
      ].join('\n| ')
    );
    // total_other = total - sum(counts), from the same query: no extra count query.
    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[2][0]).toEqual({
      query: expect.stringContaining(
        '| WHERE type == ?type\n| EVAL updated_sort = COALESCE(TO_DATETIME(updated_at), revision_time)\n| SORT updated_sort DESC, id ASC\n| KEEP _index, id, type, title, updated_at, expires_at, ki_status\n| LIMIT 3'
      ),
      params: [{ type: 'faq' }],
    });
    expect(query.mock.calls[3][0].params).toEqual([{ type: 'policy' }]);
  });

  it('drops the bucket of KIs that cannot be a group', async () => {
    query
      .mockResolvedValueOnce(
        groupBucketsResponse([
          [4, 'faq', 9, false],
          [5, null, 9, true],
        ])
      )
      .mockResolvedValueOnce(rowsResponse([]));

    const { total, total_other: totalOther, groups } = await getKiGroups(esClient, OPTIONS);

    expect({ total, totalOther }).toEqual({ total: 9, totalOther: 5 });
    expect(groups.map(({ type }) => type)).toEqual(['faq']);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('counts every KI as other when no KI has a groupable type', async () => {
    query.mockResolvedValueOnce(groupBucketsResponse([[3, null, 3, true]]));

    await expect(getKiGroups(esClient, OPTIONS)).resolves.toEqual({
      total: 3,
      total_other: 3,
      groups: [],
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('returns zeros for an AI index without KIs', async () => {
    query.mockResolvedValueOnce(groupBucketsResponse([]));

    await expect(getKiGroups(esClient, OPTIONS)).resolves.toEqual({
      total: 0,
      total_other: 0,
      groups: [],
    });
  });

  it('returns zeros when the backing store does not exist', async () => {
    query.mockReset();
    query.mockRejectedValueOnce(unknownIndexError());

    await expect(getKiGroups(esClient, OPTIONS)).resolves.toEqual({
      total: 0,
      total_other: 0,
      groups: [],
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('counts the types past maxGroups as other', async () => {
    query
      .mockResolvedValueOnce(
        groupBucketsResponse([
          [4, 'faq', 10, false],
          [3, 'policy', 10, false],
        ])
      )
      .mockResolvedValueOnce(rowsResponse([]))
      .mockResolvedValueOnce(rowsResponse([]));

    const { total, total_other: totalOther } = await getKiGroups(esClient, {
      ...OPTIONS,
      maxGroups: 2,
    });

    expect({ total, totalOther }).toEqual({ total: 10, totalOther: 3 });
  });

  it('applies status, search and sort to buckets and rows', async () => {
    query
      .mockResolvedValueOnce(groupBucketsResponse([[1, 'faq', 2, false]]))
      .mockResolvedValueOnce(rowsResponse([]));

    await getKiGroups(esClient, {
      ...OPTIONS,
      maxGroups: 2,
      previewSize: 1,
      statuses: ['expired'],
      query: 'refund',
      sort: 'title',
    });

    expect(query.mock.calls[1][0].params).toEqual([{ searchQuery: 'refund' }]);
    expect(query.mock.calls[2][0].params).toEqual([{ type: 'faq' }, { searchQuery: 'refund' }]);
    for (const call of [0, 1]) {
      expect(queryText(call)).toContain('| WHERE ki_status IN ("expired")\n');
      expect(queryText(call)).toContain('MATCH(title, ?searchQuery');
    }
    expect(queryText(0)).toContain('| LIMIT 2');
    expect(queryText(1)).toContain('| SORT _score DESC, title_sort ASC NULLS LAST, id ASC');
    expect(queryText(1)).toContain('| LIMIT 1');
  });
});
