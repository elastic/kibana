/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { OUTPUT_SAVED_OBJECT_TYPE } from '../../constants';

import { fetchIndex, fetchSavedObjectNames, fetchSavedObjects } from '.';

describe('Fleet debug service', () => {
  describe('fetchIndex', () => {
    it('allows Fleet indices (prefix .fleet-)', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.search.mockResolvedValue({ hits: { hits: [] }, took: 0, _shards: {} } as any);

      const res = await fetchIndex(esClient, '.fleet-agents');

      expect(res.ok).toBe(true);
      expect(esClient.search).toHaveBeenCalledWith({ index: '.fleet-agents' });
    });

    it('allows Fleet index patterns', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.search.mockResolvedValue({ hits: { hits: [] }, took: 0, _shards: {} } as any);

      const res = await fetchIndex(esClient, '.fleet-fileds-fromhost-meta-*');

      expect(res.ok).toBe(true);
      expect(esClient.search).toHaveBeenCalledWith({ index: '.fleet-fileds-fromhost-meta-*' });
    });

    it('rejects non-Fleet indices with ok: false and message', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const res1 = await fetchIndex(esClient, 'other-index');
      expect(res1.ok).toBe(false);
      expect(res1.body).toEqual({ message: 'Index not allowed for debug.' });

      const res2 = await fetchIndex(esClient, 'disallowed-index');
      expect(res2.ok).toBe(false);

      const res3 = await fetchIndex(esClient, '.internal-*');
      expect(res3.ok).toBe(false);

      const res4 = await fetchIndex(esClient, 'logs-elastic_agent-*');
      expect(res4.ok).toBe(false);

      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('rejects index without .fleet- prefix', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const res = await fetchIndex(esClient, 'fleet-agents');
      expect(res.ok).toBe(false);
      expect(res.body).toEqual({ message: 'Index not allowed for debug.' });
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('allows comma-separated list of Fleet indices', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.search.mockResolvedValue({ hits: { hits: [] }, took: 0, _shards: {} } as any);

      const res = await fetchIndex(esClient, '.fleet-agents,.fleet-actions');

      expect(res.ok).toBe(true);
      expect(esClient.search).toHaveBeenCalledWith({ index: '.fleet-agents,.fleet-actions' });
    });

    it('rejects comma-separated list when any segment is non-Fleet', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const res1 = await fetchIndex(esClient, '.fleet-agents,other-index');
      expect(res1.ok).toBe(false);
      expect(res1.body).toEqual({ message: 'Index not allowed for debug.' });

      const res2 = await fetchIndex(esClient, '.fleet-agents,  other-index');
      expect(res2.ok).toBe(false);

      expect(esClient.search).not.toHaveBeenCalled();
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
