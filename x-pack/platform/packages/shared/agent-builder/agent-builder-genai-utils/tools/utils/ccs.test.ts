/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  isCcsTarget,
  partitionByCcs,
  getFieldsFromFieldCaps,
  getBatchedFieldsFromFieldCaps,
  getIndexFields,
} from './ccs';
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
      { path: 'message', type: 'text', meta: {}, searchable: true },
      { path: 'status', type: 'keyword', meta: {}, searchable: true },
    ]);
  });
});

jest.mock('./mappings', () => ({
  ...jest.requireActual('./mappings'),
  getIndexMappings: jest.fn(),
}));

const getIndexMappingsMock = getIndexMappings as jest.MockedFunction<typeof getIndexMappings>;

describe('getIndexFields', () => {
  const createEsClient = (overrides?: {
    fieldCapsResponse?: unknown;
    resolveIndex?: jest.Mock;
    transport?: jest.Mock;
  }) =>
    ({
      fieldCaps: jest
        .fn()
        .mockResolvedValue(overrides?.fieldCapsResponse ?? { indices: [], fields: {} }),
      indices: {
        getMapping: jest.fn(),
        resolveIndex:
          overrides?.resolveIndex ??
          jest.fn().mockResolvedValue({ indices: [], aliases: [], data_streams: [] }),
      },
      transport: {
        request: overrides?.transport ?? jest.fn(),
      },
    } as unknown as ElasticsearchClient);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns rawMapping for local indices via _mapping API', async () => {
    const resolveIndex = jest.fn().mockResolvedValue({
      indices: [{ name: 'my-index' }],
      aliases: [],
      data_streams: [],
    });
    const esClient = createEsClient({ resolveIndex });
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

    expect(resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ['my-index'],
        allow_no_indices: true,
      })
    );
    expect(getIndexMappingsMock).toHaveBeenCalledWith({
      indices: ['my-index'],
      cleanup: true,
      esClient,
    });
    expect(result['my-index'].type).toBe('index');
    expect(result['my-index'].rawMapping).toBeDefined();
    expect(result['my-index'].rawMapping?._meta?.description).toBe('test index');
    expect(result['my-index'].fields).toEqual([
      { path: 'message', type: 'text', meta: {}, searchable: true },
    ]);
  });

  it('returns rawMapping for a data-stream input, keyed by the user-supplied name', async () => {
    const resolveIndex = jest.fn().mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [{ name: 'metrics-k8sclusterreceiver.otel-default' }],
    });
    const transport = jest.fn().mockResolvedValue({
      data_streams: [
        {
          name: 'metrics-k8sclusterreceiver.otel-default',
          effective_mappings: {
            _doc: {
              properties: { 'k8s.cluster.name': { type: 'keyword' } },
            },
          },
        },
      ],
    });
    const esClient = createEsClient({ resolveIndex, transport });

    const result = await getIndexFields({
      indices: ['metrics-k8sclusterreceiver.otel-default'],
      esClient,
    });

    expect(resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ['metrics-k8sclusterreceiver.otel-default'],
        allow_no_indices: true,
      })
    );
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/_data_stream/metrics-k8sclusterreceiver.otel-default/_mappings',
        method: 'GET',
      })
    );
    expect(getIndexMappingsMock).not.toHaveBeenCalled();

    // Attribution: the key is the caller's input, not some backing .ds-* name.
    const entry = result['metrics-k8sclusterreceiver.otel-default'];
    expect(entry).toBeDefined();
    expect(entry.type).toBe('dataStream');
    expect(entry.rawMapping).toEqual({
      properties: { 'k8s.cluster.name': { type: 'keyword' } },
    });
    expect(entry.fields).toEqual([
      { path: 'k8s.cluster.name', type: 'keyword', meta: {}, searchable: true },
    ]);
  });

  it('returns fields without rawMapping for CCS indices via _field_caps API', async () => {
    const esClient = createEsClient({
      fieldCapsResponse: {
        indices: ['remote:logs'],
        fields: {
          status: {
            keyword: { type: 'keyword', searchable: true, aggregatable: true },
          },
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
    expect(result['remote:logs'].type).toBe('indexPattern');
    expect(result['remote:logs'].rawMapping).toBeUndefined();
    expect(result['remote:logs'].fields).toEqual([
      { path: 'status', type: 'keyword', meta: {}, searchable: true },
    ]);
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

    const resolveIndex = jest.fn().mockResolvedValue({
      indices: [{ name: 'local-index' }],
      aliases: [],
      data_streams: [],
    });
    const esClient = createEsClient({
      fieldCapsResponse: {
        indices: ['cluster:remote-index'],
        fields: {
          timestamp: {
            date: { type: 'date', searchable: true, aggregatable: true },
          },
        },
      },
      resolveIndex,
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

    expect(result['local-index'].type).toBe('index');
    expect(result['local-index'].rawMapping).toBeDefined();
    expect(result['local-index'].fields).toEqual([
      { path: 'name', type: 'keyword', meta: {}, searchable: true },
    ]);

    expect(result['cluster:remote-index'].type).toBe('indexPattern');
    expect(result['cluster:remote-index'].rawMapping).toBeUndefined();
    expect(result['cluster:remote-index'].fields).toEqual([
      { path: 'timestamp', type: 'date', meta: {}, searchable: true },
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

  it('routes an alias input through _field_caps via the dedicated alias bucket', async () => {
    const resolveIndex = jest.fn().mockResolvedValue({
      indices: [],
      aliases: [{ name: 'my-alias', indices: ['backing-idx'] }],
      data_streams: [],
    });
    const esClient = createEsClient({
      resolveIndex,
      fieldCapsResponse: {
        indices: ['backing-idx'],
        fields: {
          status: {
            keyword: { type: 'keyword', searchable: true, aggregatable: true },
          },
        },
      },
    });

    const result = await getIndexFields({ indices: ['my-alias'], esClient });

    expect(getIndexMappingsMock).not.toHaveBeenCalled();
    expect(esClient.fieldCaps).toHaveBeenCalledWith({
      index: 'my-alias',
      fields: ['*'],
    });
    expect(result['my-alias'].type).toBe('alias');
    expect(result['my-alias'].rawMapping).toBeUndefined();
    expect(result['my-alias'].fields).toEqual([
      { path: 'status', type: 'keyword', meta: {}, searchable: true },
    ]);
  });

  it('routes a wildcard resolving to multiple resources through the indexPattern bucket', async () => {
    const resolveIndex = jest.fn().mockResolvedValue({
      indices: [{ name: 'logs-2026.04.21' }, { name: 'logs-2026.04.22' }],
      aliases: [],
      data_streams: [],
    });
    const esClient = createEsClient({
      resolveIndex,
      fieldCapsResponse: {
        indices: ['logs-2026.04.21', 'logs-2026.04.22'],
        fields: {
          '@timestamp': {
            date: { type: 'date', searchable: true, aggregatable: true },
          },
        },
      },
    });

    const result = await getIndexFields({ indices: ['logs-*'], esClient });

    expect(getIndexMappingsMock).not.toHaveBeenCalled();
    expect(esClient.fieldCaps).toHaveBeenCalledWith({
      index: 'logs-*',
      fields: ['*'],
    });
    expect(result['logs-*'].type).toBe('indexPattern');
    expect(result['logs-*'].rawMapping).toBeUndefined();
    expect(result['logs-*'].fields).toEqual([
      { path: '@timestamp', type: 'date', meta: {}, searchable: true },
    ]);
  });

  it('returns an empty field list when the input does not resolve to anything', async () => {
    const resolveIndex = jest.fn().mockResolvedValue({
      indices: [],
      aliases: [],
      data_streams: [],
    });
    const esClient = createEsClient({ resolveIndex });

    const result = await getIndexFields({ indices: ['does-not-exist'], esClient });

    expect(getIndexMappingsMock).not.toHaveBeenCalled();
    expect(result['does-not-exist'].type).toBe('indexPattern');
    expect(result['does-not-exist'].rawMapping).toBeUndefined();
    expect(result['does-not-exist'].fields).toEqual([]);
  });

  it('handles the k8s-otel data-stream reproduction (four data streams in one call)', async () => {
    const inputs = [
      'metrics-k8sclusterreceiver.otel-default',
      'metrics-kubeletstatsreceiver.otel-default',
      'logs-k8seventsreceiver.otel-default',
      'logs-k8sobjectsreceiver.otel-default',
    ];
    const resolveIndex = jest.fn().mockImplementation(({ name }: { name: string[] }) => {
      expect(name).toHaveLength(1);
      return Promise.resolve({
        indices: [],
        aliases: [],
        data_streams: [{ name: name[0] }],
      });
    });
    const transport = jest.fn().mockImplementation(({ path }: { path: string }) => {
      const match = path.match(/^\/_data_stream\/([^/]+)\/_mappings$/);
      const names = match ? match[1].split(',') : [];
      return Promise.resolve({
        data_streams: names.map((name) => ({
          name,
          effective_mappings: {
            _doc: { properties: { [`field_for_${name}`]: { type: 'keyword' } } },
          },
        })),
      });
    });
    const esClient = createEsClient({ resolveIndex, transport });

    const result = await getIndexFields({ indices: inputs, esClient });

    expect(resolveIndex).toHaveBeenCalledTimes(4);
    for (const input of inputs) {
      expect(result[input]).toBeDefined();
      expect(result[input].type).toBe('dataStream');
      expect(result[input].rawMapping).toEqual({
        properties: { [`field_for_${input}`]: { type: 'keyword' } },
      });
      expect(result[input].fields).toEqual([
        { path: `field_for_${input}`, type: 'keyword', meta: {}, searchable: true },
      ]);
    }
  });

  it('treats a 404 from resolveIndex as indexPattern (empty fields)', async () => {
    const notFound = new esErrors.ResponseError({
      statusCode: 404,
      body: { error: { type: 'index_not_found_exception' } },
      headers: {},
      meta: {} as any,
      warnings: [],
    } as any);
    const resolveIndex = jest.fn().mockRejectedValue(notFound);
    const esClient = createEsClient({ resolveIndex });

    const result = await getIndexFields({ indices: ['missing'], esClient });

    expect(result.missing.type).toBe('indexPattern');
    expect(result.missing.fields).toEqual([]);
    expect(result.missing.rawMapping).toBeUndefined();
  });
});

describe('getBatchedFieldsFromFieldCaps', () => {
  it('batches requests when resource names would exceed URL length', async () => {
    const resources = Array.from(
      { length: 100 },
      (_, i) => `remote_cluster:logs-elastic_agent.input-${String(i).padStart(7, '0')}`
    );

    const esClient = {
      fieldCaps: jest.fn().mockImplementation((params: any) => {
        const indexNames = (params.index as string).split(',');
        const fields: Record<string, Record<string, any>> = {};
        for (const name of indexNames) {
          fields[`field_${name}`] = {
            keyword: {
              type: 'keyword',
              searchable: true,
              aggregatable: true,
              indices: [name],
            },
          };
        }
        return Promise.resolve({ indices: indexNames, fields });
      }),
    } as unknown as ElasticsearchClient;

    const result = await getBatchedFieldsFromFieldCaps({ resources, esClient });

    expect((esClient.fieldCaps as jest.Mock).mock.calls.length).toBeGreaterThan(1);

    for (const call of (esClient.fieldCaps as jest.Mock).mock.calls) {
      expect((call[0].index as string).length).toBeLessThanOrEqual(3000);
    }

    expect(Object.keys(result).length).toBe(100);
    for (const name of resources) {
      expect(result[name]).toBeDefined();
      expect(result[name].length).toBe(1);
      expect(result[name][0].path).toBe(`field_${name}`);
    }
  });
});
