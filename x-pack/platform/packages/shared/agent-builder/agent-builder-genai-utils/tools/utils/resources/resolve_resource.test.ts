/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsResourceType } from '@kbn/agent-builder-common';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { processFieldCapsResponse } from '../field_caps';
import { flattenMapping, getIndexMappings } from '../mappings';
import { resolveResource, resolveResourceForEsql } from './resolve_resource';

jest.mock('../field_caps');
jest.mock('../mappings');

describe('resolveResource', () => {
  const processFieldCapsResponseMock = jest.mocked(processFieldCapsResponse);
  const flattenMappingMock = jest.mocked(flattenMapping);
  const getIndexMappingsMock = jest.mocked(getIndexMappings);

  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('keeps strict single-resource validation in resolveResource', async () => {
    await expect(resolveResource({ resourceName: 'logs-*', esClient })).rejects.toThrow(
      'Tried to resolve resource for multiple resources using pattern logs-*'
    );
  });

  it('uses index mappings for a single resolved index in resolveResourceForEsql', async () => {
    esClient.indices.resolveIndex.mockResolvedValue({
      indices: [{ name: 'logs-1', attributes: ['open'] }],
      aliases: [],
      data_streams: [],
    });
    getIndexMappingsMock.mockResolvedValue({
      'logs-1': {
        mappings: {
          properties: {},
          _meta: { description: 'logs index' },
        },
      },
    });
    flattenMappingMock.mockReturnValue([{ path: 'message', type: 'text', meta: {} }]);

    const result = await resolveResourceForEsql({ resourceName: 'logs-1', esClient });

    expect(esClient.indices.resolveIndex).toHaveBeenCalledWith({
      name: ['logs-1'],
      allow_no_indices: false,
      expand_wildcards: ['all'],
    });
    expect(getIndexMappingsMock).toHaveBeenCalledWith({
      indices: ['logs-1'],
      esClient,
      cleanup: true,
    });
    expect(result).toEqual({
      name: 'logs-1',
      type: EsResourceType.index,
      fields: [{ path: 'message', type: 'text', meta: {} }],
      description: 'logs index',
    });
  });

  it('uses field caps for multi-target patterns in resolveResourceForEsql', async () => {
    esClient.indices.resolveIndex.mockResolvedValue({
      indices: [
        { name: 'logs-1', attributes: ['open'] },
        { name: 'logs-2', attributes: ['open'] },
      ],
      aliases: [],
      data_streams: [],
    });
    esClient.fieldCaps.mockResolvedValue({
      indices: ['logs-1', 'logs-2'],
      fields: {},
    });
    processFieldCapsResponseMock.mockReturnValue({
      indices: ['logs-1', 'logs-2'],
      fields: [{ path: '@timestamp', type: 'date', meta: {} }],
    });

    const result = await resolveResourceForEsql({ resourceName: 'logs-*', esClient });

    expect(esClient.fieldCaps).toHaveBeenCalledWith({
      index: 'logs-*',
      fields: ['*'],
    });
    expect(getIndexMappingsMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      name: 'logs-*',
      type: EsResourceType.index,
      fields: [{ path: '@timestamp', type: 'date', meta: {} }],
    });
  });
});
