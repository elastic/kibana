/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsSerializer, SavedObjectsRawDoc } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { CASE_OBSERVABLE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { ObservableService, groupValuesByTypeKey } from '.';

const rawHit = ({
  id,
  caseId = 'case-1',
  typeKey = 'observable-type-ipv4',
  value = '10.0.0.8',
  createdAt = '2026-11-06T09:30:00.000Z',
  sort,
}: {
  id: string;
  caseId?: string;
  typeKey?: string;
  value?: string;
  createdAt?: string;
  sort?: Array<string | number>;
}) => ({
  _index: '.kibana_alerting_cases',
  _id: `${CASE_OBSERVABLE_SAVED_OBJECT}:${id}`,
  _source: {
    type: CASE_OBSERVABLE_SAVED_OBJECT,
    namespaces: ['default'],
    references: [{ type: CASE_SAVED_OBJECT, id: caseId, name: 'associated-cases' }],
    [CASE_OBSERVABLE_SAVED_OBJECT]: {
      owner: 'securitySolution',
      type_key: typeKey,
      value,
      description: null,
      source_attachment_id: null,
      created_at: createdAt,
      created_by: { username: 'analyst', full_name: null, email: null },
      updated_at: null,
      updated_by: null,
    },
  },
  ...(sort != null && { sort }),
});

const searchResponse = ({
  hits = [],
  total = hits.length,
  aggregations,
}: {
  hits?: Array<ReturnType<typeof rawHit>>;
  total?: number;
  aggregations?: unknown;
}) => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0, skipped: 0 },
  hits: { total: { value: total, relation: 'eq' as const }, hits },
  ...(aggregations != null && { aggregations }),
});

describe('ObservableService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const savedObjectsSerializer = {
    rawToSavedObject: jest.fn(({ _id, _source }: SavedObjectsRawDoc) => ({
      id: _id.split(':').pop(),
      type: _source.type,
      namespaces: _source.namespaces,
      references: _source.references,
      attributes: _source[_source.type],
    })),
  } as unknown as ISavedObjectsSerializer;
  const service = new ObservableService({
    log: loggingSystemMock.createLogger(),
    unsecuredSavedObjectsClient,
    savedObjectsSerializer,
    namespace: 'default',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('groupValuesByTypeKey', () => {
    it('groups values by type key and drops repeats', () => {
      expect(
        groupValuesByTypeKey([
          { typeKey: 'a', value: '1' },
          { typeKey: 'b', value: '2' },
          { typeKey: 'a', value: '1' },
          { typeKey: 'a', value: '3' },
        ])
      ).toEqual(
        new Map([
          ['a', ['1', '3']],
          ['b', ['2']],
        ])
      );
    });
  });

  describe('bulkCreate', () => {
    it('creates objects with the given ids, a case reference and wait_for', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          { id: 'obs-1', type: CASE_OBSERVABLE_SAVED_OBJECT, attributes: {}, references: [] },
        ],
      });

      const created = await service.bulkCreate({
        caseId: 'case-1',
        owner: 'securitySolution',
        user: { username: 'analyst', full_name: null, email: null },
        observables: [
          {
            id: 'obs-1',
            typeKey: 'observable-type-ipv4',
            value: '10.0.0.8',
            description: null,
            createdAt: '2026-11-06T09:30:00.000Z',
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            id: 'obs-1',
            references: [{ type: CASE_SAVED_OBJECT, id: 'case-1', name: 'associated-cases' }],
            attributes: expect.objectContaining({
              owner: 'securitySolution',
              type_key: 'observable-type-ipv4',
              value: '10.0.0.8',
              created_at: '2026-11-06T09:30:00.000Z',
            }),
          }),
        ],
        { refresh: 'wait_for' }
      );
      expect(created).toEqual([
        {
          id: 'obs-1',
          typeKey: 'observable-type-ipv4',
          value: '10.0.0.8',
          description: null,
          createdAt: '2026-11-06T09:30:00.000Z',
          updatedAt: null,
        },
      ]);
    });

    it('counts an id that already exists as created, because a retry reuses its ids', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: 'obs-1',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            attributes: {},
            references: [],
            error: { statusCode: 409, error: 'Conflict', message: 'exists' },
          },
        ],
      });

      const created = await service.bulkCreate({
        caseId: 'case-1',
        owner: 'securitySolution',
        user: { username: 'analyst', full_name: null, email: null },
        observables: [
          {
            id: 'obs-1',
            typeKey: 'observable-type-ipv4',
            value: '10.0.0.8',
            description: null,
            createdAt: '2026-11-06T09:30:00.000Z',
          },
        ],
      });

      expect(created.map(({ id }) => id)).toEqual(['obs-1']);
    });

    it('throws when an object fails for another reason', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            id: 'obs-1',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            attributes: {},
            references: [],
            error: { statusCode: 500, error: 'Internal', message: 'boom' },
          },
        ],
      });

      await expect(
        service.bulkCreate({
          caseId: 'case-1',
          owner: 'securitySolution',
          user: { username: 'analyst', full_name: null, email: null },
          observables: [
            {
              id: 'obs-1',
              typeKey: 'observable-type-ipv4',
              value: '10.0.0.8',
              description: null,
              createdAt: '2026-11-06T09:30:00.000Z',
            },
          ],
        })
      ).rejects.toThrow('Failed to create 1 observables on case case-1');
    });
  });

  describe('getForCase', () => {
    it('keeps only observables that reference the case', async () => {
      unsecuredSavedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'obs-1',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            attributes: {},
            references: [{ type: CASE_SAVED_OBJECT, id: 'case-1', name: 'associated-cases' }],
          },
          {
            id: 'obs-2',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            attributes: {},
            references: [{ type: CASE_SAVED_OBJECT, id: 'case-2', name: 'associated-cases' }],
          },
          {
            id: 'obs-3',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            attributes: {},
            references: [],
            error: { statusCode: 404, error: 'Not found', message: 'missing' },
          },
        ],
      });

      const { found, missingIds } = await service.getForCase('case-1', ['obs-1', 'obs-2', 'obs-3']);

      expect(found.map(({ id }) => id)).toEqual(['obs-1']);
      expect(missingIds).toEqual(['obs-2', 'obs-3']);
    });
  });

  describe('findExisting', () => {
    it('sends one clause per type key with the values as a set', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValue(
        searchResponse({ hits: [rawHit({ id: 'obs-1' })] })
      );

      const existing = await service.findExisting('case-1', [
        { typeKey: 'observable-type-ipv4', value: '10.0.0.8' },
        { typeKey: 'observable-type-ipv4', value: '10.0.0.9' },
        { typeKey: 'observable-type-hostname', value: 'host-1' },
      ]);

      const [[request]] = unsecuredSavedObjectsClient.search.mock.calls;
      expect(request).toMatchObject({
        type: CASE_OBSERVABLE_SAVED_OBJECT,
        namespaces: ['default'],
        size: 3,
      });
      expect(JSON.stringify(request.query)).toContain(
        JSON.stringify({ terms: { 'cases-observables.value': ['10.0.0.8', '10.0.0.9'] } })
      );
      expect(JSON.stringify(request.query)).toContain(
        JSON.stringify({ terms: { 'references.id': ['case-1'] } })
      );
      expect(existing.map(({ id, value }) => ({ id, value }))).toEqual([
        { id: 'obs-1', value: '10.0.0.8' },
      ]);
    });

    it('does not search when there are no keys', async () => {
      await expect(service.findExisting('case-1', [])).resolves.toEqual([]);
      expect(unsecuredSavedObjectsClient.search).not.toHaveBeenCalled();
    });
  });

  describe('findPage', () => {
    it('sorts with tie-breakers, filters by type and value prefix, and pages with search_after', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValue(
        searchResponse({
          hits: [rawHit({ id: 'obs-1', sort: [1, 'observable-type-ipv4', '10.0.0.8'] })],
          total: 7,
        })
      );

      const { items, total } = await service.findPage({
        caseId: 'case-1',
        perPage: 1,
        searchAfter: [0, 'a', 'b'],
        sortField: 'createdAt',
        sortOrder: 'desc',
        typeKeys: ['observable-type-ipv4'],
        search: '10.0',
      });

      const [[request]] = unsecuredSavedObjectsClient.search.mock.calls;
      expect(request.sort).toEqual([
        { 'cases-observables.created_at': { order: 'desc' } },
        { 'cases-observables.type_key': { order: 'asc' } },
        { 'cases-observables.value': { order: 'asc' } },
      ]);
      expect(request.search_after).toEqual([0, 'a', 'b']);
      expect(request.track_total_hits).toBe(true);
      expect(JSON.stringify(request.query)).toContain(
        JSON.stringify({
          prefix: { 'cases-observables.value': { value: '10.0', case_insensitive: true } },
        })
      );
      expect(JSON.stringify(request.query)).toContain(
        JSON.stringify({ terms: { 'cases-observables.type_key': ['observable-type-ipv4'] } })
      );
      expect(total).toBe(7);
      expect(items).toEqual([
        {
          observable: expect.objectContaining({ id: 'obs-1', value: '10.0.0.8' }),
          sort: [1, 'observable-type-ipv4', '10.0.0.8'],
        },
      ]);
    });
  });

  describe('getPreviews', () => {
    it('returns the count and the oldest objects of each case', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValue(
        searchResponse({
          aggregations: {
            refs: {
              cases: {
                caseIds: {
                  buckets: [
                    {
                      key: 'case-1',
                      doc_count: 120,
                      reverse: {
                        doc_count: 120,
                        hits: {
                          hits: { hits: [rawHit({ id: 'obs-1' }), rawHit({ id: 'obs-2' })] },
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

      const previews = await service.getPreviews(['case-1', 'case-2'], 2);

      const [[request]] = unsecuredSavedObjectsClient.search.mock.calls;
      expect(request.size).toBe(0);
      expect(JSON.stringify(request.aggs)).toContain('"top_hits":{"size":2');
      expect(previews.get('case-1')).toEqual({
        count: 120,
        oldest: [
          expect.objectContaining({ id: 'obs-1' }),
          expect.objectContaining({ id: 'obs-2' }),
        ],
      });
      expect(previews.has('case-2')).toBe(false);
    });

    it('asks for counts only when no preview is needed', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValue(searchResponse({}));

      await service.getPreviews(['case-1'], 0);

      const [[request]] = unsecuredSavedObjectsClient.search.mock.calls;
      expect(JSON.stringify(request.aggs)).not.toContain('top_hits');
    });

    it('does not search without cases', async () => {
      await expect(service.getPreviews([], 50)).resolves.toEqual(new Map());
      expect(unsecuredSavedObjectsClient.search).not.toHaveBeenCalled();
    });
  });

  describe('findSimilarCandidates', () => {
    it('excludes the source case and returns cases with their shared counts', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValue(
        searchResponse({
          aggregations: {
            refs: {
              cases: {
                caseIds: {
                  buckets: [
                    { key: 'case-2', doc_count: 3 },
                    { key: 'case-3', doc_count: 1 },
                  ],
                },
              },
            },
          },
        })
      );

      const candidates = await service.findSimilarCandidates({
        excludeCaseId: 'case-1',
        keys: [{ typeKey: 'observable-type-ipv4', value: '10.0.0.8' }],
        owners: ['securitySolution'],
        size: 1000,
      });

      const [[request]] = unsecuredSavedObjectsClient.search.mock.calls;
      expect(JSON.stringify(request.query)).toContain('"must_not"');
      expect(JSON.stringify(request.query)).toContain(
        JSON.stringify({ terms: { 'cases-observables.owner': ['securitySolution'] } })
      );
      expect(candidates).toEqual([
        { caseId: 'case-2', sharedCount: 3 },
        { caseId: 'case-3', sharedCount: 1 },
      ]);
    });

    it('keeps every case when none is excluded', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValue(
        searchResponse({ aggregations: { refs: { cases: { caseIds: { buckets: [] } } } } })
      );

      await service.findSimilarCandidates({
        keys: [{ typeKey: 'observable-type-ipv4', value: '10.0.0.8' }],
        owners: ['securitySolution'],
        size: 10_000,
      });

      const [[request]] = unsecuredSavedObjectsClient.search.mock.calls;
      expect(JSON.stringify(request.query)).not.toContain('"must_not"');
      expect(JSON.stringify(request.aggs)).toContain('"size":10000');
    });
  });
});

describe('ObservableService.deleteForCases', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const log = loggingSystemMock.createLogger();
  const emptySearch = {
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, failed: 0, skipped: 0 },
    hits: { hits: [] },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    unsecuredSavedObjectsClient.search.mockResolvedValue(emptySearch);
  });

  it('schedules the background deletion in the request namespace', async () => {
    const scheduleCaseObservablesDeletion = jest.fn().mockResolvedValue(undefined);
    const service = new ObservableService({
      log,
      unsecuredSavedObjectsClient,
      savedObjectsSerializer: {} as ISavedObjectsSerializer,
      namespace: 'space-1',
      scheduleCaseObservablesDeletion,
    });

    await service.deleteForCases(['case-1']);

    expect(scheduleCaseObservablesDeletion).toHaveBeenCalledWith({
      caseIds: ['case-1'],
      namespace: 'space-1',
    });
    expect(unsecuredSavedObjectsClient.search).not.toHaveBeenCalled();
  });

  it('deletes before returning when scheduling fails', async () => {
    const service = new ObservableService({
      log,
      unsecuredSavedObjectsClient,
      savedObjectsSerializer: {} as ISavedObjectsSerializer,
      namespace: 'default',
      scheduleCaseObservablesDeletion: jest.fn().mockRejectedValue(new Error('no task manager')),
    });

    await service.deleteForCases(['case-1']);

    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('deleting them now'));
    expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledTimes(1);
  });

  it('deletes before returning without Task Manager', async () => {
    const service = new ObservableService({
      log,
      unsecuredSavedObjectsClient,
      savedObjectsSerializer: {} as ISavedObjectsSerializer,
      namespace: 'default',
    });

    await service.deleteForCases(['case-1']);

    expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledTimes(1);
  });
});
