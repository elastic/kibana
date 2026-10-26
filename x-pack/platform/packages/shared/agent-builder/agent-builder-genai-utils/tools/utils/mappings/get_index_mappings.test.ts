/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getIndexMappings } from './get_index_mappings';
import { cleanupMapping } from './cleanup_mapping';

jest.mock('./cleanup_mapping');

const cleanupMappingMock = cleanupMapping as jest.MockedFunction<typeof cleanupMapping>;

describe('getIndexMappings', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    cleanupMappingMock.mockImplementation((mappings) => mappings);
  });

  afterEach(() => {
    cleanupMappingMock.mockReset();
  });

  it('calls the ES client with the right parameters', async () => {
    esClient.indices.getMapping.mockResolvedValue({} as any);

    await getIndexMappings({
      indices: ['index-a', 'index-b'],
      esClient,
      cleanup: false,
    });

    expect(esClient.indices.getMapping).toHaveBeenCalledTimes(1);
    expect(esClient.indices.getMapping).toHaveBeenCalledWith({
      index: ['index-a', 'index-b'],
    });
  });

  it('returns mappings for a single index', async () => {
    const mappings: MappingTypeMapping = {
      properties: { foo: { type: 'text' } },
    };
    esClient.indices.getMapping.mockResolvedValue({
      'my-index': { mappings },
    } as any);

    const result = await getIndexMappings({
      indices: ['my-index'],
      esClient,
      cleanup: false,
    });

    expect(result).toEqual({
      'my-index': { mappings },
    });
  });

  it('calls cleanupMapping when cleanup=true', async () => {
    const mappings: MappingTypeMapping = {
      properties: { foo: { type: 'text' } },
    };
    esClient.indices.getMapping.mockResolvedValue({
      'my-index': { mappings },
    } as any);

    await getIndexMappings({
      indices: ['my-index'],
      esClient,
      cleanup: true,
    });

    expect(cleanupMappingMock).toHaveBeenCalledWith(mappings);
  });

  it('batches requests when index names would exceed URL length', async () => {
    const indices = Array.from(
      { length: 100 },
      (_, i) => `my-very-long-index-name-for-testing-${String(i).padStart(7, '0')}`
    );

    esClient.indices.getMapping.mockImplementation((params: any) => {
      const indexNames = params.index as string[];
      const response: Record<string, { mappings: MappingTypeMapping }> = {};
      for (const name of indexNames) {
        response[name] = {
          mappings: { properties: { [`field_${name}`]: { type: 'keyword' } } },
        };
      }
      return Promise.resolve(response) as any;
    });

    const result = await getIndexMappings({
      indices,
      esClient,
      cleanup: false,
    });

    expect(esClient.indices.getMapping.mock.calls.length).toBeGreaterThan(1);

    expect(Object.keys(result).length).toBe(100);
    for (const idx of indices) {
      expect(result[idx]).toBeDefined();
      expect(result[idx].mappings).toEqual({
        properties: { [`field_${idx}`]: { type: 'keyword' } },
      });
    }
  });

  describe('skipUnauthorized', () => {
    const make403 = () =>
      new esErrors.ResponseError({
        statusCode: 403,
        body: { error: { type: 'security_exception' } },
        headers: {},
        meta: {} as any,
        warnings: [],
      } as any);

    it('re-throws 403 by default (skipUnauthorized=false)', async () => {
      esClient.indices.getMapping.mockRejectedValue(make403());

      await expect(
        getIndexMappings({ indices: ['index-a'], esClient, cleanup: false })
      ).rejects.toThrow();
    });

    it('drops a single unauthorized index and returns an empty result', async () => {
      esClient.indices.getMapping.mockRejectedValue(make403());

      const result = await getIndexMappings({
        indices: ['metrics-endpoint.metadata_current_default'],
        esClient,
        cleanup: false,
        skipUnauthorized: true,
      });

      expect(result).toEqual({});
      // initial batch + one per-index retry, both rejected
      expect(esClient.indices.getMapping).toHaveBeenCalledTimes(2);
    });

    it('retries per-index on a batch 403 and returns only authorized indices', async () => {
      const authorizedMappings: MappingTypeMapping = { properties: { host: { type: 'keyword' } } };

      esClient.indices.getMapping.mockImplementation((params: any) => {
        const names: string[] = params.index;
        // batch call fails; single-index calls succeed only for authorized-index
        if (names.length > 1) {
          return Promise.reject(make403());
        }
        if (names[0] === 'authorized-index') {
          return Promise.resolve({ 'authorized-index': { mappings: authorizedMappings } }) as any;
        }
        return Promise.reject(make403());
      });

      const result = await getIndexMappings({
        indices: ['authorized-index', 'denied-index'],
        esClient,
        cleanup: false,
        skipUnauthorized: true,
      });

      expect(result).toEqual({ 'authorized-index': { mappings: authorizedMappings } });
      // initial batch + 2 per-index retries
      expect(esClient.indices.getMapping).toHaveBeenCalledTimes(3);
    });

    it('re-throws non-403 errors even when skipUnauthorized=true', async () => {
      esClient.indices.getMapping.mockRejectedValue(new Error('network error'));

      await expect(
        getIndexMappings({ indices: ['index-a'], esClient, skipUnauthorized: true })
      ).rejects.toThrow('network error');
    });

    it('rethrows non-403 errors from per-index retries after a batch 403', async () => {
      esClient.indices.getMapping.mockImplementation((params: any) => {
        const names: string[] = params.index;
        if (names.length > 1) {
          return Promise.reject(make403());
        }
        return Promise.reject(new Error('service unavailable'));
      });

      await expect(
        getIndexMappings({ indices: ['index-a', 'index-b'], esClient, skipUnauthorized: true })
      ).rejects.toThrow('service unavailable');
    });
  });
});
