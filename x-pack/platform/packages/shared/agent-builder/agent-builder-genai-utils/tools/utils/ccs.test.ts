/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { isCcsTarget, partitionByCcs, getFieldsFromFieldCaps, getIndexFields } from './ccs';
import { getIndexMappings } from './mappings';

describe('isCcsTarget', () => {
  it('returns true for a CCS pattern with cluster prefix', () => {
    expect(isCcsTarget('remote_cluster:my-index')).toBe(true);
  });

  it('returns true for a CCS wildcard pattern', () => {
    expect(isCcsTarget('cluster_a:logs-*')).toBe(true);
  });

  it('returns true for a wildcard cluster pattern', () => {
    expect(isCcsTarget('*:metrics-*')).toBe(true);
  });

  it('returns false for a local index name', () => {
    expect(isCcsTarget('my-local-index')).toBe(false);
  });

  it('returns false for a local wildcard pattern', () => {
    expect(isCcsTarget('logs-*')).toBe(false);
  });

  it('returns false for the default pattern', () => {
    expect(isCcsTarget('*')).toBe(false);
  });
});

describe('partitionByCcs', () => {
  it('separates local and remote resources', () => {
    const resources = [
      { name: 'local-index', type: 'index' },
      { name: 'remote:remote-index', type: 'index' },
      { name: 'another-local', type: 'alias' },
      { name: 'cluster_b:logs-*', type: 'data_stream' },
    ];

    const { local, remote } = partitionByCcs(resources);

    expect(local).toEqual([
      { name: 'local-index', type: 'index' },
      { name: 'another-local', type: 'alias' },
    ]);
    expect(remote).toEqual([
      { name: 'remote:remote-index', type: 'index' },
      { name: 'cluster_b:logs-*', type: 'data_stream' },
    ]);
  });

  it('returns all resources as local when none are CCS targets', () => {
    const resources = [{ name: 'index-a' }, { name: 'index-b' }];

    const { local, remote } = partitionByCcs(resources);

    expect(local).toEqual(resources);
    expect(remote).toEqual([]);
  });

  it('returns all resources as remote when all are CCS targets', () => {
    const resources = [{ name: 'cluster:index-a' }, { name: 'cluster:index-b' }];

    const { local, remote } = partitionByCcs(resources);

    expect(local).toEqual([]);
    expect(remote).toEqual(resources);
  });

  it('handles an empty array', () => {
    const { local, remote } = partitionByCcs([]);

    expect(local).toEqual([]);
    expect(remote).toEqual([]);
  });
});

describe('getFieldsFromFieldCaps', () => {
  it('calls fieldCaps and returns processed fields', async () => {
    const mockFieldCapsResponse = {
      indices: ['remote:my-index'],
      fields: {
        message: {
          text: { type: 'text', searchable: true, aggregatable: false },
        },
        status: {
          keyword: { type: 'keyword', searchable: true, aggregatable: true },
        },
      },
    };

    const esClient = {
      fieldCaps: jest.fn().mockResolvedValue(mockFieldCapsResponse),
    } as unknown as ElasticsearchClient;

    const fields = await getFieldsFromFieldCaps({
      resource: 'remote:my-index',
      esClient,
    });

    expect(esClient.fieldCaps).toHaveBeenCalledWith({
      index: 'remote:my-index',
      fields: ['*'],
    });

    expect(fields.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      { path: 'message', type: 'text', meta: {} },
      { path: 'status', type: 'keyword', meta: {} },
    ]);
  });
});

jest.mock('./mappings', () => ({
  ...jest.requireActual('./mappings'),
  getIndexMappings: jest.fn(),
}));

const getIndexMappingsMock = getIndexMappings as jest.MockedFunction<typeof getIndexMappings>;

describe('getIndexFields', () => {
  const createEsClient = (fieldCapsResponse?: unknown) =>
    ({
      fieldCaps: jest.fn().mockResolvedValue(fieldCapsResponse ?? { indices: [], fields: {} }),
      indices: { getMapping: jest.fn() },
    } as unknown as ElasticsearchClient);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns rawMapping for local indices via _mapping API', async () => {
    const esClient = createEsClient();
    getIndexMappingsMock.mockResolvedValue({
      'my-index': {
        mappings: {
          _meta: { description: 'test index' },
          properties: {
            message: { type: 'text' },
          },
        },
      },
    });

    const result = await getIndexFields({
      indices: ['my-index'],
      esClient,
    });

    expect(getIndexMappingsMock).toHaveBeenCalledWith({
      indices: ['my-index'],
      cleanup: true,
      esClient,
    });
    expect(result['my-index'].rawMapping).toBeDefined();
    expect(result['my-index'].rawMapping?._meta?.description).toBe('test index');
    expect(result['my-index'].fields).toEqual([{ path: 'message', type: 'text', meta: {} }]);
  });

  it('returns fields without rawMapping for CCS indices via _field_caps API', async () => {
    const esClient = createEsClient({
      indices: ['remote:logs'],
      fields: {
        status: {
          keyword: { type: 'keyword', searchable: true, aggregatable: true },
        },
      },
    });

    const result = await getIndexFields({
      indices: ['remote:logs'],
      esClient,
    });

    expect(esClient.fieldCaps).toHaveBeenCalledWith({
      index: 'remote:logs',
      fields: ['*'],
    });
    expect(getIndexMappingsMock).not.toHaveBeenCalled();
    expect(result['remote:logs'].rawMapping).toBeUndefined();
    expect(result['remote:logs'].fields).toEqual([{ path: 'status', type: 'keyword', meta: {} }]);
  });

  it('handles a mix of local and CCS indices', async () => {
    getIndexMappingsMock.mockResolvedValue({
      'local-index': {
        mappings: {
          properties: {
            name: { type: 'keyword' },
          },
        },
      },
    });

    const esClient = createEsClient({
      indices: ['cluster:remote-index'],
      fields: {
        timestamp: {
          date: { type: 'date', searchable: true, aggregatable: true },
        },
      },
    });

    const result = await getIndexFields({
      indices: ['local-index', 'cluster:remote-index'],
      esClient,
    });

    expect(getIndexMappingsMock).toHaveBeenCalledWith({
      indices: ['local-index'],
      cleanup: true,
      esClient,
    });
    expect(esClient.fieldCaps).toHaveBeenCalled();

    expect(result['local-index'].rawMapping).toBeDefined();
    expect(result['local-index'].fields).toEqual([{ path: 'name', type: 'keyword', meta: {} }]);

    expect(result['cluster:remote-index'].rawMapping).toBeUndefined();
    expect(result['cluster:remote-index'].fields).toEqual([
      { path: 'timestamp', type: 'date', meta: {} },
    ]);
  });

  it('returns an empty record for an empty indices list', async () => {
    const esClient = createEsClient();

    const result = await getIndexFields({
      indices: [],
      esClient,
    });

    expect(result).toEqual({});
    expect(getIndexMappingsMock).not.toHaveBeenCalled();
    expect(esClient.fieldCaps).not.toHaveBeenCalled();
  });
});
