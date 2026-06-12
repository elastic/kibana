/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
});
