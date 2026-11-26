/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SavedObject, SavedObjectsRawDoc, SavedObjectsRawDocSource } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { serializerMock } from '@kbn/core-saved-objects-base-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  CASE_OBSERVABLE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_OBSERVABLES_PER_CASE,
} from '../../../../common/constants';
import type { ObservablePersistedAttributes } from '../../../common/types/observable';
import type { CaseWithFieldObservables } from '../types';
import {
  attributes,
  bulkResponse,
  CASE_ID,
  errorResult,
  NAMESPACE,
  savedObject,
} from '../test_utils';
import { ObservableGetter } from './get';

const caseReferenceQuery = (caseIds: string[]) => ({
  nested: {
    path: 'references',
    query: {
      bool: {
        filter: [
          { term: { 'references.type': CASE_SAVED_OBJECT } },
          { terms: { 'references.id': caseIds } },
        ],
      },
    },
  },
});

const OLDEST_FIRST = [
  { 'cases-observables.created_at': { order: 'asc' } },
  { 'cases-observables.type_key': { order: 'asc' } },
  { 'cases-observables.value': { order: 'asc' } },
];

const rawHit = (
  id: string,
  overrides: Partial<ObservablePersistedAttributes> = {},
  sort: estypes.SortResults = []
): estypes.SearchHit<SavedObjectsRawDocSource> => ({
  _index: '.kibana_alerting_cases',
  _id: `${CASE_OBSERVABLE_SAVED_OBJECT}:${id}`,
  _source: {
    type: CASE_OBSERVABLE_SAVED_OBJECT,
    [CASE_OBSERVABLE_SAVED_OBJECT]: attributes(overrides),
  },
  sort,
});

const searchResponse = <A = unknown>({
  hits = [],
  total = hits.length,
  aggregations,
}: {
  hits?: Array<estypes.SearchHit<SavedObjectsRawDocSource>>;
  total?: number;
  aggregations?: A;
}): estypes.SearchResponse<SavedObjectsRawDocSource, A> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: total, relation: 'eq' }, hits },
  ...(aggregations != null && { aggregations }),
});

const withFieldObservables = (id: string, count: number): CaseWithFieldObservables => ({
  id,
  observables: Array.from({ length: count }, (_, index) => ({
    id: `${id}-field-${index}`,
    typeKey: 'observable-type-ipv4',
    value: `10.0.0.${index}`,
    description: null,
    createdAt: '2026-11-06T09:30:00.000Z',
    updatedAt: null,
  })),
});

const keyClause = (typeKey: string, values: string[]) => ({
  bool: {
    filter: [
      { term: { 'cases-observables.type_key': typeKey } },
      { terms: { 'cases-observables.value': values } },
    ],
  },
});

describe('ObservableGetter', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const savedObjectsSerializer = serializerMock.create();
  const log = loggerMock.create();
  let getter: ObservableGetter;

  beforeEach(() => {
    jest.clearAllMocks();

    savedObjectsSerializer.rawToSavedObject.mockImplementation(
      (raw: SavedObjectsRawDoc) =>
        ({
          id: raw._id.replace(`${CASE_OBSERVABLE_SAVED_OBJECT}:`, ''),
          type: CASE_OBSERVABLE_SAVED_OBJECT,
          attributes: raw._source[CASE_OBSERVABLE_SAVED_OBJECT],
          references: [],
        } as SavedObject)
    );

    getter = new ObservableGetter({
      log,
      unsecuredSavedObjectsClient,
      savedObjectsSerializer,
      namespace: NAMESPACE,
    });
  });

  it.each<[string, () => Promise<object>, object]>([
    ['getForCase', () => getter.getForCase(CASE_ID, []), { found: [], missingIds: [] }],
    ['findExisting', () => getter.findExisting(CASE_ID, []), []],
    ['getPreviews', () => getter.getPreviews([]), new Map()],
  ])('%s does not call Elasticsearch with nothing to look up', async (_method, run, expected) => {
    await expect(run()).resolves.toEqual(expected);
    expect(unsecuredSavedObjectsClient.bulkGet).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.search).not.toHaveBeenCalled();
  });

  describe('getForCase', () => {
    it('keeps the objects of the case and reports the rest as missing', async () => {
      unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce(
        bulkResponse([
          savedObject('observable-1'),
          savedObject('observable-2', 'other-case'),
          errorResult('observable-3', 404, 'Not found'),
        ])
      );

      const result = await getter.getForCase(CASE_ID, [
        'observable-1',
        'observable-2',
        'observable-3',
      ]);

      expect(unsecuredSavedObjectsClient.bulkGet).toHaveBeenCalledWith([
        { id: 'observable-1', type: CASE_OBSERVABLE_SAVED_OBJECT },
        { id: 'observable-2', type: CASE_OBSERVABLE_SAVED_OBJECT },
        { id: 'observable-3', type: CASE_OBSERVABLE_SAVED_OBJECT },
      ]);
      expect(result).toEqual({
        found: [savedObject('observable-1')],
        missingIds: ['observable-2', 'observable-3'],
      });
    });

    /**
     * FAILURE SCENARIO: Observable read fails for a reason other than not found
     * Symptom: An edit or delete by id fails with a 500 instead of reporting the observable missing
     * Log signature: `Failed to get 1 observables of case case-1: Error: Failed to get 1 observables`
     * Trigger: The bulk get returns a per-object error other than 404
     * Recovery: Retrying the request; nothing was written
     */
    it('throws on an error other than not found', async () => {
      unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce(
        bulkResponse([errorResult('observable-1', 500, 'shard failure')])
      );

      await expect(getter.getForCase(CASE_ID, ['observable-1'])).rejects.toThrow(
        'Failed to get 1 observables: observable-1: shard failure'
      );
    });
  });

  describe('countForCase', () => {
    it("counts the case's objects in the request's space", async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(searchResponse({ total: 42 }));

      await expect(getter.countForCase(CASE_ID)).resolves.toBe(42);
      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith({
        type: CASE_OBSERVABLE_SAVED_OBJECT,
        namespaces: [NAMESPACE],
        size: 0,
        track_total_hits: true,
        query: { bool: { filter: [caseReferenceQuery([CASE_ID])] } },
      });
    });
  });

  describe('findExisting', () => {
    it('searches one clause per type key with its values as a set', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(
        searchResponse({ hits: [rawHit('observable-1')] })
      );

      const result = await getter.findExisting(CASE_ID, [
        { typeKey: 'observable-type-ipv4', value: '10.0.0.8' },
        { typeKey: 'observable-type-ipv4', value: '10.0.0.9' },
        { typeKey: 'observable-type-ipv4', value: '10.0.0.8' },
        { typeKey: 'observable-type-hostname', value: 'host-1' },
      ]);

      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith({
        type: CASE_OBSERVABLE_SAVED_OBJECT,
        namespaces: [NAMESPACE],
        size: 5_000,
        sort: OLDEST_FIRST,
        query: {
          bool: {
            filter: [
              caseReferenceQuery([CASE_ID]),
              {
                bool: {
                  should: [
                    keyClause('observable-type-ipv4', ['10.0.0.8', '10.0.0.9']),
                    keyClause('observable-type-hostname', ['host-1']),
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      });
      expect(result).toEqual([
        {
          id: 'observable-1',
          typeKey: 'observable-type-ipv4',
          value: '10.0.0.8',
          description: null,
          createdAt: '2026-11-06T09:30:00.000Z',
          updatedAt: null,
        },
      ]);
    });

    it('pages until a page comes back short, so repeats cannot crowd out other matches', async () => {
      const fullPage = Array.from({ length: 5_000 }, (_, index) =>
        rawHit(`repeat-${index}`, {}, ['2026-11-06T09:30:00.000Z', 'ipv4', `${index}`])
      );
      unsecuredSavedObjectsClient.search
        .mockResolvedValueOnce(searchResponse({ hits: fullPage }))
        .mockResolvedValueOnce(
          searchResponse({ hits: [rawHit('observable-9', { value: '10.0.0.9' })] })
        );

      const result = await getter.findExisting(CASE_ID, [
        { typeKey: 'observable-type-ipv4', value: '10.0.0.8' },
        { typeKey: 'observable-type-ipv4', value: '10.0.0.9' },
      ]);

      const { calls } = unsecuredSavedObjectsClient.search.mock;
      expect(calls).toHaveLength(2);
      expect(calls[0][0]).not.toHaveProperty('search_after');
      expect(calls[1][0]).toHaveProperty('search_after', [
        '2026-11-06T09:30:00.000Z',
        'ipv4',
        '4999',
      ]);
      expect(result).toHaveLength(5_001);
      expect(result[5_000].value).toBe('10.0.0.9');
    });
  });

  describe('findPage', () => {
    it('sorts by the requested field and breaks ties by type key and value', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(
        searchResponse({
          hits: [rawHit('observable-1', {}, ['2026-11-06T09:30:00.000Z', 'ipv4', '10.0.0.8'])],
          total: 7,
        })
      );

      const result = await getter.findPage({
        caseId: CASE_ID,
        perPage: 20,
        sortField: 'createdAt',
        sortOrder: 'desc',
      });

      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith({
        type: CASE_OBSERVABLE_SAVED_OBJECT,
        namespaces: [NAMESPACE],
        size: 20,
        track_total_hits: true,
        sort: [
          { 'cases-observables.created_at': { order: 'desc' } },
          { 'cases-observables.type_key': { order: 'asc' } },
          { 'cases-observables.value': { order: 'asc' } },
        ],
        query: { bool: { filter: [caseReferenceQuery([CASE_ID])] } },
      });
      expect(result).toEqual({
        items: [
          {
            observable: expect.objectContaining({ id: 'observable-1', value: '10.0.0.8' }),
            sort: ['2026-11-06T09:30:00.000Z', 'ipv4', '10.0.0.8'],
          },
        ],
        total: 7,
      });
    });

    it.each([
      ['value', ['value', 'type_key']],
      ['typeKey', ['type_key', 'value']],
    ] as const)('sorts by %s with its tie-breaker', async (sortField, fields) => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(searchResponse({}));

      await getter.findPage({ caseId: CASE_ID, perPage: 20, sortField, sortOrder: 'asc' });

      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: fields.map((field) => ({ [`cases-observables.${field}`]: { order: 'asc' } })),
        })
      );
    });

    it('filters by type key and by the start of the value, ignoring case, after a cursor', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(searchResponse({}));

      await getter.findPage({
        caseId: CASE_ID,
        perPage: 20,
        searchAfter: ['10.0.0.8', 'observable-type-ipv4'],
        sortField: 'value',
        sortOrder: 'asc',
        typeKeys: ['observable-type-ipv4'],
        search: '10.0',
      });

      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          search_after: ['10.0.0.8', 'observable-type-ipv4'],
          query: {
            bool: {
              filter: [
                caseReferenceQuery([CASE_ID]),
                { terms: { 'cases-observables.type_key': ['observable-type-ipv4'] } },
                {
                  prefix: {
                    'cases-observables.value': { value: '10.0', case_insensitive: true },
                  },
                },
              ],
            },
          },
        })
      );
    });

    it('leaves out empty type and value filters', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(searchResponse({}));

      await getter.findPage({
        caseId: CASE_ID,
        perPage: 20,
        sortField: 'createdAt',
        sortOrder: 'asc',
        typeKeys: [],
        search: '',
      });

      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { filter: [caseReferenceQuery([CASE_ID])] } },
        })
      );
    });
  });

  describe('getPreviews', () => {
    it("returns each case's count and oldest objects from one search", async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(
        searchResponse({
          aggregations: {
            refs: {
              cases: {
                caseIds: {
                  buckets: [
                    {
                      key: 'case-1',
                      reverse: {
                        doc_count: 120,
                        oldest: {
                          hits: { hits: [rawHit('observable-1'), rawHit('observable-2')] },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        })
      );

      const previews = await getter.getPreviews([
        withFieldObservables('case-1', MAX_OBSERVABLES_PER_CASE - 2),
        withFieldObservables('case-2', MAX_OBSERVABLES_PER_CASE - 1),
        withFieldObservables('case-1', MAX_OBSERVABLES_PER_CASE - 2),
      ]);

      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith({
        type: CASE_OBSERVABLE_SAVED_OBJECT,
        namespaces: [NAMESPACE],
        size: 0,
        query: { bool: { filter: [caseReferenceQuery(['case-1', 'case-2'])] } },
        aggs: {
          refs: {
            nested: { path: 'references' },
            aggs: {
              cases: {
                filter: { term: { 'references.type': CASE_SAVED_OBJECT } },
                aggs: {
                  caseIds: {
                    terms: {
                      field: 'references.id',
                      size: 2,
                      include: ['case-1', 'case-2'],
                    },
                    aggs: {
                      reverse: {
                        reverse_nested: {},
                        aggs: { oldest: { top_hits: { size: 2, sort: OLDEST_FIRST } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      expect([...previews]).toEqual([
        [
          'case-1',
          {
            count: 120,
            oldest: [
              expect.objectContaining({ id: 'observable-1' }),
              expect.objectContaining({ id: 'observable-2' }),
            ],
          },
        ],
      ]);
    });

    it.each([
      ['the case with the most room left in its field', [45, 10], 40],
      ['50 for a case whose field is empty', [0, 30], MAX_OBSERVABLES_PER_CASE],
    ])('reads as many objects as %s needs', async (_case, fieldCounts, size) => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(searchResponse({}));

      await getter.getPreviews(
        fieldCounts.map((count, index) => withFieldObservables(`case-${index}`, count))
      );

      expect(unsecuredSavedObjectsClient.search.mock.calls[0][0]).toHaveProperty(
        'aggs.refs.aggs.cases.aggs.caseIds.aggs.reverse.aggs.oldest.top_hits.size',
        size
      );
    });

    it('returns counts only when every field holds 50 or more', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(
        searchResponse({
          aggregations: {
            refs: {
              cases: { caseIds: { buckets: [{ key: 'case-1', reverse: { doc_count: 3 } }] } },
            },
          },
        })
      );

      const previews = await getter.getPreviews([
        withFieldObservables('case-1', MAX_OBSERVABLES_PER_CASE),
        withFieldObservables('case-2', MAX_OBSERVABLES_PER_CASE + 1),
      ]);

      expect(unsecuredSavedObjectsClient.search.mock.calls[0][0]).not.toHaveProperty(
        'aggs.refs.aggs.cases.aggs.caseIds.aggs.reverse.aggs'
      );
      expect(previews.get('case-1')).toEqual({ count: 3, oldest: [] });
    });

    it('rejects and logs when the search fails', async () => {
      const error = new Error('search failed');
      unsecuredSavedObjectsClient.search.mockRejectedValueOnce(error);

      await expect(getter.getPreviews([withFieldObservables('case-1', 0)])).rejects.toBe(error);
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get the observables previews of 1 cases: Error: search failed',
        { error }
      );
    });

    /**
     * FAILURE SCENARIO: the preview search fails after a write is saved
     * Symptom: the write response lists and counts the case field's observables only, until the next read
     * Log signature: `Failed to get the observables previews of 1 cases: Error: search failed`
     * Trigger: Elasticsearch rejects or times out the search on `.kibana_alerting_cases`
     * Recovery: none needed; the write and everything after it ran, and the next read lists both stores
     */
    it('logs a failed search and returns no previews with ignoreErrors', async () => {
      const error = new Error('search failed');
      unsecuredSavedObjectsClient.search.mockRejectedValueOnce(error);

      await expect(
        getter.getPreviews([withFieldObservables('case-1', 0)], { ignoreErrors: true })
      ).resolves.toEqual(new Map());
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get the observables previews of 1 cases: Error: search failed',
        { error }
      );
    });
  });
});
