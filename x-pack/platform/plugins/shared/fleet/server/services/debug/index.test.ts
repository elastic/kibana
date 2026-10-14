/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { OUTPUT_SAVED_OBJECT_TYPE } from '../../constants';

import { addNamespaceFilteringToQuery } from '../spaces/query_namespaces_filtering';

import { fetchIndex, fetchSavedObjectNames, fetchSavedObjects, isIndexAllowedForDebug } from '.';

jest.mock('../spaces/query_namespaces_filtering');

const mockAddNamespaceFilteringToQuery = addNamespaceFilteringToQuery as jest.MockedFunction<
  typeof addNamespaceFilteringToQuery
>;

describe('Fleet debug service', () => {
  beforeEach(() => {
    // By default, pass the query through unchanged (space awareness off / no filter added).
    mockAddNamespaceFilteringToQuery.mockImplementation(async (query) => query);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isIndexAllowedForDebug', () => {
    it('allows the three Fleet UI indices', () => {
      expect(isIndexAllowedForDebug('.fleet-agents')).toBe(true);
      expect(isIndexAllowedForDebug('.fleet-actions')).toBe(true);
      expect(isIndexAllowedForDebug('.fleet-enrollment-api-keys')).toBe(true);
    });

    it('rejects other .fleet- prefixed indices not in the allowlist', () => {
      expect(isIndexAllowedForDebug('.fleet-policies')).toBe(false);
      expect(isIndexAllowedForDebug('.fleet-fileds-fromhost-meta-*')).toBe(false);
      expect(isIndexAllowedForDebug('.fleet-artifacts')).toBe(false);
      expect(isIndexAllowedForDebug('.fleet-secrets')).toBe(false);
    });

    it('rejects non-Fleet indices', () => {
      expect(isIndexAllowedForDebug('other-index')).toBe(false);
      expect(isIndexAllowedForDebug('.internal-*')).toBe(false);
      expect(isIndexAllowedForDebug('logs-elastic_agent-*')).toBe(false);
    });

    it('rejects comma-separated index lists', () => {
      expect(isIndexAllowedForDebug('.fleet-agents,.fleet-actions')).toBe(false);
      expect(isIndexAllowedForDebug('.fleet-agents,other-index')).toBe(false);
    });

    it('strips whitespace before checking', () => {
      expect(isIndexAllowedForDebug('  .fleet-agents  ')).toBe(true);
    });
  });

  describe('fetchIndex', () => {
    it('rejects disallowed indices with ok: false', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const res = await fetchIndex(esClient, '.fleet-policies');
      expect(res.ok).toBe(false);
      expect(res.body).toEqual({ message: 'Index not allowed for debug.' });
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('calls esClient.search with the namespace-filtered query (space awareness off)', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.search.mockResolvedValue({ hits: { hits: [] }, took: 0, _shards: {} } as any);

      const passThrough = { bool: {} };
      mockAddNamespaceFilteringToQuery.mockResolvedValue(passThrough);

      const res = await fetchIndex(esClient, '.fleet-agents', 'default');

      expect(res.ok).toBe(true);
      expect(mockAddNamespaceFilteringToQuery).toHaveBeenCalledWith({ bool: {} }, 'default');
      expect(esClient.search).toHaveBeenCalledWith({ index: '.fleet-agents', query: passThrough });
    });

    it('passes the custom-space namespace filter to esClient.search', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.search.mockResolvedValue({ hits: { hits: [] }, took: 0, _shards: {} } as any);

      const customSpaceFilter = {
        bool: {
          filter: [{ terms: { namespaces: ['my-space', '*'] } }],
        },
      };
      mockAddNamespaceFilteringToQuery.mockResolvedValue(customSpaceFilter);

      await fetchIndex(esClient, '.fleet-agents', 'my-space');

      expect(esClient.search).toHaveBeenCalledWith({
        index: '.fleet-agents',
        query: customSpaceFilter,
      });
    });

    it('passes the default-space namespace filter (should + must_not exists) to esClient.search', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.search.mockResolvedValue({ hits: { hits: [] }, took: 0, _shards: {} } as any);

      const defaultSpaceFilter = {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  { terms: { namespaces: ['default', '*'] } },
                  { bool: { must_not: [{ exists: { field: 'namespaces' } }] } },
                ],
              },
            },
          ],
        },
      };
      mockAddNamespaceFilteringToQuery.mockResolvedValue(defaultSpaceFilter);

      await fetchIndex(esClient, '.fleet-enrollment-api-keys', 'default');

      expect(esClient.search).toHaveBeenCalledWith({
        index: '.fleet-enrollment-api-keys',
        query: defaultSpaceFilter,
      });
    });

    it('still calls esClient.search when no spaceId supplied (space awareness disabled path)', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.search.mockResolvedValue({ hits: { hits: [] }, took: 0, _shards: {} } as any);

      const unfiltered = { bool: {} };
      mockAddNamespaceFilteringToQuery.mockResolvedValue(unfiltered);

      await fetchIndex(esClient, '.fleet-actions', undefined);

      expect(mockAddNamespaceFilteringToQuery).toHaveBeenCalledWith({ bool: {} }, undefined);
      expect(esClient.search).toHaveBeenCalledWith({ index: '.fleet-actions', query: unfiltered });
    });
  });

  describe('fetchSavedObjects', () => {
    it('allows Fleet saved object types', async () => {
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 20 });

      const res = await fetchSavedObjects(soClient, OUTPUT_SAVED_OBJECT_TYPE, 'my-output');

      expect(res.ok).toBe(true);
      expect(soClient.find).toHaveBeenCalledWith({
        type: OUTPUT_SAVED_OBJECT_TYPE,
        search: '"my-output"',
        searchFields: ['name'],
      });
    });

    it('rejects non-Fleet saved object types with ok: false and message', async () => {
      const soClient = savedObjectsClientMock.create();

      const res1 = await fetchSavedObjects(soClient, 'action', '');
      expect(res1.ok).toBe(false);
      expect(res1.body).toEqual({ message: 'Saved object type not allowed for debug.' });

      const res2 = await fetchSavedObjects(soClient, 'dashboard', '');
      expect(res2.ok).toBe(false);

      expect(soClient.find).not.toHaveBeenCalled();
    });

    it('uses Fleet escapeSearchQueryPhrase for name in search phrase', async () => {
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 20 });

      const res = await fetchSavedObjects(soClient, OUTPUT_SAVED_OBJECT_TYPE, 'x" OR "y');

      expect(res.ok).toBe(true);
      expect(soClient.find).toHaveBeenCalledWith({
        type: OUTPUT_SAVED_OBJECT_TYPE,
        search: '"x\\" OR \\"y"',
        searchFields: ['name'],
      });
    });
  });

  describe('fetchSavedObjectNames', () => {
    it('allows Fleet saved object types', async () => {
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
        aggregations: { names: { buckets: [] } },
      } as any);

      const res = await fetchSavedObjectNames(soClient, OUTPUT_SAVED_OBJECT_TYPE);

      expect(res.ok).toBe(true);
      expect(soClient.find).toHaveBeenCalledWith({
        type: OUTPUT_SAVED_OBJECT_TYPE,
        aggs: {
          names: {
            terms: { field: `${OUTPUT_SAVED_OBJECT_TYPE}.attributes.name` },
          },
        },
      });
    });

    it('rejects non-Fleet saved object types with ok: false and message', async () => {
      const soClient = savedObjectsClientMock.create();

      const res = await fetchSavedObjectNames(soClient, 'action');
      expect(res.ok).toBe(false);
      expect(res.body).toEqual({ message: 'Saved object type not allowed for debug.' });

      expect(soClient.find).not.toHaveBeenCalled();
    });
  });
});
