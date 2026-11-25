/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { estypes } from '@elastic/elasticsearch';
import type {
  SavedObject,
  SavedObjectsBulkResponse,
  SavedObjectsRawDoc,
  SavedObjectsRawDocSource,
} from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { serializerMock } from '@kbn/core-saved-objects-base-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { CASE_OBSERVABLE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { CASE_REF_NAME } from '../../common/constants';
import type { ObservablePersistedAttributes } from '../../common/types/observable';
import type { ObservableToCreate } from '.';
import { ObservableService } from '.';

const NAMESPACE = 'space-1';
const CASE_ID = 'case-1';
const user = { username: 'analyst', full_name: 'Analyst', email: null };

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

const attributes = (
  overrides: Partial<ObservablePersistedAttributes> = {}
): ObservablePersistedAttributes => ({
  owner: 'securitySolution',
  type_key: 'observable-type-ipv4',
  value: '10.0.0.8',
  description: null,
  source_attachment_id: null,
  created_at: '2026-11-06T09:30:00.000Z',
  created_by: user,
  updated_at: null,
  updated_by: null,
  ...overrides,
});

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

const toCreate = (index: number): ObservableToCreate => ({
  id: `observable-${index}`,
  typeKey: 'observable-type-ipv4',
  value: `10.0.0.${index}`,
  description: null,
  createdAt: '2026-11-06T09:30:00.000Z',
});

describe('ObservableService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const savedObjectsSerializer = serializerMock.create();
  const log = loggerMock.create();
  let service: ObservableService;

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

    service = new ObservableService({
      log,
      unsecuredSavedObjectsClient,
      savedObjectsSerializer,
      namespace: NAMESPACE,
    });
  });

  describe('bulkCreate', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.bulkCreate.mockImplementation(async (objects) => ({
        saved_objects: objects.map(({ id, type, attributes: attrs, references }) => ({
          id: id ?? '',
          type,
          attributes: attrs,
          references: references ?? [],
        })),
      }));
    });

    it('writes each observable under its id, referencing the case', async () => {
      const result = await service.bulkCreate({
        caseId: CASE_ID,
        owner: 'securitySolution',
        observables: [{ ...toCreate(1), description: 'from an alert' }],
        user,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          {
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            id: 'observable-1',
            attributes: {
              owner: 'securitySolution',
              type_key: 'observable-type-ipv4',
              value: '10.0.0.1',
              description: 'from an alert',
              source_attachment_id: null,
              created_at: '2026-11-06T09:30:00.000Z',
              created_by: user,
              updated_at: null,
              updated_by: null,
            },
            references: [{ type: CASE_SAVED_OBJECT, name: CASE_REF_NAME, id: CASE_ID }],
          },
        ],
        { refresh: 'wait_for' }
      );
      expect(result).toEqual([
        {
          id: 'observable-1',
          typeKey: 'observable-type-ipv4',
          value: '10.0.0.1',
          description: 'from an alert',
          createdAt: '2026-11-06T09:30:00.000Z',
          updatedAt: null,
        },
      ]);
    });

    it('logs the attempt at debug level', async () => {
      await service.bulkCreate({
        caseId: CASE_ID,
        owner: 'securitySolution',
        observables: [toCreate(1)],
        user,
      });

      expect(log.debug).toHaveBeenCalledWith(
        'Attempting to bulk create 1 observables on case case-1'
      );
      expect(log.error).not.toHaveBeenCalled();
    });

    it('writes at most 1,000 objects per request', async () => {
      const observables = Array.from({ length: 1_001 }, (_, index) => toCreate(index));

      const result = await service.bulkCreate({
        caseId: CASE_ID,
        owner: 'securitySolution',
        observables,
        user,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(2);
      expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0][0]).toHaveLength(1_000);
      expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[1][0]).toHaveLength(1);
      expect(result.map(({ id }) => id)).toEqual(observables.map(({ id }) => id));
    });

    it('counts an id an earlier attempt already created (409) as created', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'observable-1',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            error: { statusCode: 409, error: 'Conflict', message: 'Saved object conflict' },
          },
        ],
      } as SavedObjectsBulkResponse<ObservablePersistedAttributes>);

      const result = await service.bulkCreate({
        caseId: CASE_ID,
        owner: 'securitySolution',
        observables: [toCreate(1)],
        user,
      });

      expect(result.map(({ id }) => id)).toEqual(['observable-1']);
    });

    /**
     * FAILURE SCENARIO: Observable objects fail to index
     * Symptom: The request that adds observables fails with a 500
     * Log signature: `Failed to bulk create 2 observables on case case-1: Error: Failed to create 1 observables on case case-1`
     * Trigger: Elasticsearch rejects one object of the bulk create (anything but a 409)
     * Recovery: The caller retries with the same ids; objects already created count as created
     */
    it('throws and logs an error when an object fails with anything but a 409', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'observable-1',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            attributes: attributes(),
            references: [],
          },
          {
            id: 'observable-2',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            error: { statusCode: 400, error: 'Bad Request', message: 'mapper_parsing_exception' },
          },
        ],
      } as SavedObjectsBulkResponse<ObservablePersistedAttributes>);

      await expect(
        service.bulkCreate({
          caseId: CASE_ID,
          owner: 'securitySolution',
          observables: [toCreate(1), toCreate(2)],
          user,
        })
      ).rejects.toThrow(
        'Failed to create 1 observables on case case-1: observable-2: mapper_parsing_exception'
      );

      expect(log.error).toHaveBeenCalledTimes(1);
      const [message, meta] = log.error.mock.calls[0];
      expect(message).toBe(
        'Failed to bulk create 2 observables on case case-1: Error: Failed to create 1 observables on case case-1: observable-2: mapper_parsing_exception'
      );
      expect(Boom.isBoom(meta?.error)).toBe(true);
    });
  });

  describe('getForCase', () => {
    it('does not call Elasticsearch without ids', async () => {
      await expect(service.getForCase(CASE_ID, [])).resolves.toEqual({
        found: [],
        missingIds: [],
      });
      expect(unsecuredSavedObjectsClient.bulkGet).not.toHaveBeenCalled();
    });

    it('keeps the objects of the case and reports the rest as missing', async () => {
      const ofCase = {
        id: 'observable-1',
        type: CASE_OBSERVABLE_SAVED_OBJECT,
        attributes: attributes(),
        references: [{ type: CASE_SAVED_OBJECT, name: CASE_REF_NAME, id: CASE_ID }],
      };
      unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          ofCase,
          {
            id: 'observable-2',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            attributes: attributes(),
            references: [{ type: CASE_SAVED_OBJECT, name: CASE_REF_NAME, id: 'other-case' }],
          },
          {
            id: 'observable-3',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            error: { statusCode: 404, error: 'Not Found', message: 'Not found' },
          },
        ],
      } as SavedObjectsBulkResponse<ObservablePersistedAttributes>);

      const result = await service.getForCase(CASE_ID, [
        'observable-1',
        'observable-2',
        'observable-3',
      ]);

      expect(unsecuredSavedObjectsClient.bulkGet).toHaveBeenCalledWith([
        { id: 'observable-1', type: CASE_OBSERVABLE_SAVED_OBJECT },
        { id: 'observable-2', type: CASE_OBSERVABLE_SAVED_OBJECT },
        { id: 'observable-3', type: CASE_OBSERVABLE_SAVED_OBJECT },
      ]);
      expect(result).toEqual({ found: [ofCase], missingIds: ['observable-2', 'observable-3'] });
    });

    /**
     * FAILURE SCENARIO: Observable read fails for a reason other than not found
     * Symptom: An edit or delete by id fails with a 500 instead of reporting the observable missing
     * Log signature: `Failed to get 1 observables of case case-1: Error: Failed to get observable observable-1`
     * Trigger: The bulk get returns a per-object error other than 404
     * Recovery: Retrying the request; nothing was written
     */
    it('throws on an error other than not found', async () => {
      unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'observable-1',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            error: { statusCode: 500, error: 'Internal Server Error', message: 'shard failure' },
          },
        ],
      } as SavedObjectsBulkResponse<ObservablePersistedAttributes>);

      await expect(service.getForCase(CASE_ID, ['observable-1'])).rejects.toThrow(
        'Failed to get observable observable-1: shard failure'
      );
      expect(log.error).toHaveBeenCalledWith(
        'Failed to get 1 observables of case case-1: Error: Failed to get observable observable-1: shard failure',
        { error: expect.any(Error) }
      );
    });
  });

  describe('update', () => {
    it('updates the object with the version and waits for the refresh', async () => {
      await service.update({
        id: 'observable-1',
        attributes: { value: '10.0.0.9', updated_at: '2026-11-07T09:30:00.000Z' },
        version: 'WzEsMV0=',
      });

      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
        CASE_OBSERVABLE_SAVED_OBJECT,
        'observable-1',
        { value: '10.0.0.9', updated_at: '2026-11-07T09:30:00.000Z' },
        { version: 'WzEsMV0=', refresh: 'wait_for' }
      );
    });

    /**
     * FAILURE SCENARIO: Concurrent edit of one observable
     * Symptom: The edit request fails with a 409
     * Log signature: `Failed to update observable observable-1: Error: conflict`
     * Trigger: The object changed after the caller read its version
     * Recovery: The caller re-reads the observable and retries
     */
    it('rethrows a conflict and logs it', async () => {
      const conflict = Boom.conflict('conflict');
      unsecuredSavedObjectsClient.update.mockRejectedValueOnce(conflict);

      await expect(
        service.update({ id: 'observable-1', attributes: { value: 'x' }, version: 'v1' })
      ).rejects.toBe(conflict);
      expect(log.error).toHaveBeenCalledWith(
        'Failed to update observable observable-1: Error: conflict',
        { error: conflict }
      );
    });
  });

  describe('bulkDelete', () => {
    it('does not call Elasticsearch without ids', async () => {
      await service.bulkDelete([]);
      expect(unsecuredSavedObjectsClient.bulkDelete).not.toHaveBeenCalled();
    });

    it('deletes by id and ignores ids that are already gone', async () => {
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'observable-1', type: CASE_OBSERVABLE_SAVED_OBJECT, success: true },
          {
            id: 'observable-2',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            success: false,
            error: { statusCode: 404, error: 'Not Found', message: 'Not found' },
          },
        ],
      });

      await service.bulkDelete(['observable-1', 'observable-2']);

      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith(
        [
          { type: CASE_OBSERVABLE_SAVED_OBJECT, id: 'observable-1' },
          { type: CASE_OBSERVABLE_SAVED_OBJECT, id: 'observable-2' },
        ],
        { refresh: 'wait_for' }
      );
      expect(log.error).not.toHaveBeenCalled();
    });

    /**
     * FAILURE SCENARIO: Observable delete fails
     * Symptom: The delete request fails with a 500 and the observable is still listed
     * Log signature: `Failed to delete 1 observables: Error: Failed to delete 1 observables: observable-1: es down`
     * Trigger: The bulk delete reports a per-object failure other than 404
     * Recovery: Retrying the delete; already-deleted ids are ignored
     */
    it('throws when an id fails to delete for a reason other than not found', async () => {
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          {
            id: 'observable-1',
            type: CASE_OBSERVABLE_SAVED_OBJECT,
            success: false,
            error: { statusCode: 500, error: 'Internal Server Error', message: 'es down' },
          },
        ],
      });

      await expect(service.bulkDelete(['observable-1'])).rejects.toThrow(
        'Failed to delete 1 observables: observable-1: es down'
      );
      expect(log.error).toHaveBeenCalledWith(
        'Failed to delete 1 observables: Error: Failed to delete 1 observables: observable-1: es down',
        { error: expect.any(Error) }
      );
    });
  });

  describe('countForCase', () => {
    it("counts the case's objects in the request's space", async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(searchResponse({ total: 42 }));

      await expect(service.countForCase(CASE_ID)).resolves.toBe(42);
      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith({
        type: CASE_OBSERVABLE_SAVED_OBJECT,
        namespaces: [NAMESPACE],
        size: 0,
        track_total_hits: true,
        query: { bool: { filter: [caseReferenceQuery([CASE_ID])] } },
      });
    });

    /**
     * FAILURE SCENARIO: Count search fails
     * Symptom: The request that needs the case's count fails with a 500
     * Log signature: `Failed to count the observables of case case-1: Error: search failed`
     * Trigger: The search on `.kibana_alerting_cases` rejects
     * Recovery: Retrying the request
     */
    it('rethrows a search failure and logs it', async () => {
      const failure = new Error('search failed');
      unsecuredSavedObjectsClient.search.mockRejectedValueOnce(failure);

      await expect(service.countForCase(CASE_ID)).rejects.toBe(failure);
      expect(log.error).toHaveBeenCalledWith(
        'Failed to count the observables of case case-1: Error: search failed',
        { error: failure }
      );
    });
  });

  describe('findExisting', () => {
    it('does not search without keys', async () => {
      await expect(service.findExisting(CASE_ID, [])).resolves.toEqual([]);
      expect(unsecuredSavedObjectsClient.search).not.toHaveBeenCalled();
    });

    it('searches one clause per type key with its values as a set', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(
        searchResponse({ hits: [rawHit('observable-1')] })
      );

      const result = await service.findExisting(CASE_ID, [
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
                    {
                      bool: {
                        filter: [
                          { term: { 'cases-observables.type_key': 'observable-type-ipv4' } },
                          { terms: { 'cases-observables.value': ['10.0.0.8', '10.0.0.9'] } },
                        ],
                      },
                    },
                    {
                      bool: {
                        filter: [
                          { term: { 'cases-observables.type_key': 'observable-type-hostname' } },
                          { terms: { 'cases-observables.value': ['host-1'] } },
                        ],
                      },
                    },
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

      const result = await service.findExisting(CASE_ID, [
        { typeKey: 'observable-type-ipv4', value: '10.0.0.8' },
        { typeKey: 'observable-type-ipv4', value: '10.0.0.9' },
      ]);

      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledTimes(2);
      expect(unsecuredSavedObjectsClient.search.mock.calls[0][0]).not.toHaveProperty(
        'search_after'
      );
      expect(unsecuredSavedObjectsClient.search.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          search_after: ['2026-11-06T09:30:00.000Z', 'ipv4', '4999'],
        })
      );
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

      const result = await service.findPage({
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
      [
        'value',
        [
          { 'cases-observables.value': { order: 'asc' } },
          { 'cases-observables.type_key': { order: 'asc' } },
        ],
      ],
      [
        'typeKey',
        [
          { 'cases-observables.type_key': { order: 'asc' } },
          { 'cases-observables.value': { order: 'asc' } },
        ],
      ],
    ] as const)('sorts by %s with its tie-breaker', async (sortField, sort) => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(searchResponse({}));

      await service.findPage({ caseId: CASE_ID, perPage: 20, sortField, sortOrder: 'asc' });

      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ sort })
      );
    });

    it('filters by type key and by the start of the value, ignoring case, after a cursor', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(searchResponse({}));

      await service.findPage({
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

      await service.findPage({
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
    it('does not search without case ids', async () => {
      await expect(service.getPreviews([], 50)).resolves.toEqual(new Map());
      expect(unsecuredSavedObjectsClient.search).not.toHaveBeenCalled();
    });

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

      const previews = await service.getPreviews(['case-1', 'case-2', 'case-1'], 2);

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

    it('returns counts only for a preview size of 0', async () => {
      unsecuredSavedObjectsClient.search.mockResolvedValueOnce(
        searchResponse({
          aggregations: {
            refs: {
              cases: { caseIds: { buckets: [{ key: 'case-1', reverse: { doc_count: 3 } }] } },
            },
          },
        })
      );

      const previews = await service.getPreviews(['case-1'], 0);

      expect(unsecuredSavedObjectsClient.search.mock.calls[0][0].aggs).toEqual(
        expect.objectContaining({
          refs: expect.objectContaining({
            aggs: expect.objectContaining({
              cases: expect.objectContaining({
                aggs: {
                  caseIds: expect.objectContaining({ aggs: { reverse: { reverse_nested: {} } } }),
                },
              }),
            }),
          }),
        })
      );
      expect(previews.get('case-1')).toEqual({ count: 3, oldest: [] });
    });
  });
});
