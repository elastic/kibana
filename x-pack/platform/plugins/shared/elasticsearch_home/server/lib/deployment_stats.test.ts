/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesResolveIndexResponse,
  IndicesStatsResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  countVectors,
  fetchApiKeysStats,
  fetchIndexStats,
  fetchMonitorPrivileges,
  fetchNewIndex,
  type MonitorPrivileges,
} from './deployment_stats';

const USER_INDICES_PATTERN = ['*', '-.*', '-traces-agent_builder.otel-*'];

describe('fetchMonitorPrivileges', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockHasPrivileges = ({
    allIndices,
    cluster,
  }: {
    allIndices: boolean;
    cluster: boolean;
  }) => {
    client.asCurrentUser.security.hasPrivileges.mockResolvedValue({
      has_all_requested: allIndices && cluster,
      username: 'elastic',
      application: {},
      cluster: { monitor: cluster },
      index: { '*': { monitor: allIndices } },
    });
  };

  it('checks cluster monitor and index monitor over all indices in a single call', async () => {
    mockHasPrivileges({ allIndices: true, cluster: true });

    await expect(fetchMonitorPrivileges(client, logger)).resolves.toEqual({
      canMonitorAllIndices: true,
      canMonitorCluster: true,
    });

    expect(client.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      cluster: ['monitor'],
      index: [{ names: ['*'], privileges: ['monitor'] }],
    });
  });

  it('reports the two privileges independently', async () => {
    mockHasPrivileges({ allIndices: false, cluster: true });

    await expect(fetchMonitorPrivileges(client, logger)).resolves.toEqual({
      canMonitorAllIndices: false,
      canMonitorCluster: true,
    });
  });

  it('denies both (rather than granting either) when the check itself fails', async () => {
    client.asCurrentUser.security.hasPrivileges.mockRejectedValue(new Error('boom'));

    await expect(fetchMonitorPrivileges(client, logger)).resolves.toEqual({
      canMonitorAllIndices: false,
      canMonitorCluster: false,
    });
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('countVectors', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockVectorStats = (denseCount: number, sparseCount = 0) => {
    client.asInternalUser.indices.stats.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
      _all: {},
      indices: {
        vectordb: {
          shards: {
            '0': [
              {
                dense_vector: { value_count: denseCount },
                sparse_vector: { value_count: sparseCount },
              },
            ],
          },
        },
      },
    });
  };

  it('sums dense and sparse vector value_counts from operator indices.stats', async () => {
    mockVectorStats(100, 25);

    await expect(countVectors(client, logger)).resolves.toBe(125);

    expect(client.asInternalUser.indices.stats).toHaveBeenCalledWith({
      index: USER_INDICES_PATTERN,
      expand_wildcards: ['open'],
      level: 'shards',
      metric: ['dense_vector', 'sparse_vector'],
      filter_path: [
        '_shards',
        'indices.*.shards.*.dense_vector.value_count',
        'indices.*.shards.*.sparse_vector.value_count',
      ],
    });
  });

  it('counts each logical shard once when multiple copies report vectors', async () => {
    client.asInternalUser.indices.stats.mockResolvedValue({
      _shards: { total: 2, successful: 2, failed: 0 },
      _all: {},
      indices: {
        vectordb: {
          shards: {
            // the indexing shard and a search shard of the same logical shard
            '0': [{ dense_vector: { value_count: 100 } }, { dense_vector: { value_count: 90 } }],
            // a cold shard where only a search copy remains
            '1': [{ sparse_vector: { value_count: 10 } }],
          },
        },
      },
    });

    await expect(countVectors(client, logger)).resolves.toBe(110);
  });

  it('treats missing dense/sparse stats as zero', async () => {
    client.asInternalUser.indices.stats.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
      _all: {},
    });

    await expect(countVectors(client, logger)).resolves.toBe(0);
  });

  it('returns null when not all shards responded', async () => {
    client.asInternalUser.indices.stats.mockResolvedValue({
      _shards: { total: 3, successful: 2, failed: 0 },
      _all: {},
      indices: {
        vectordb: {
          shards: { '0': [{ dense_vector: { value_count: 100 } }] },
        },
      },
    });

    await expect(countVectors(client, logger)).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('2 of 3 shards'));
  });
});

describe('fetchIndexStats', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  const FULL_ACCESS = { showPanel: true, showDocuments: true, showTotalSize: true };
  const APP_LOGS_BACKING_INDICES = [
    '.ds-logs-app-default-2026.10.21-000001',
    '.ds-logs-app-default-2026.10.21-000002',
  ];
  const forbidden = () => Object.assign(new Error('forbidden'), { statusCode: 403 });

  const mockDocumentCount = (count: number, failedShards = 0) => {
    client.asCurrentUser.count.mockResolvedValue({
      count,
      _shards: { total: 2, successful: 2 - failedShards, skipped: 0, failed: failedShards },
    });
  };

  const mockCatIndices = (indices: Array<{ index: string; 'creation.date': string }>) => {
    client.asCurrentUser.cat.indices.mockResolvedValue(indices);
  };

  const mockMetering = (
    indices: Array<{ name: string; num_docs: number; size_in_bytes: number; datastream?: string }>,
    dataStreams: string[] = []
  ) => {
    client.asSecondaryAuthUser.transport.request.mockResolvedValue({
      _total: {
        num_docs: indices.reduce((sum, i) => sum + i.num_docs, 0),
        size_in_bytes: indices.reduce((sum, i) => sum + i.size_in_bytes, 0),
      },
      indices,
      datastreams: dataStreams.map((name) => ({ name })),
    });
  };

  // the request's `filter_path` keeps just the names, and the backing indices of each data stream
  const mockResolvedIndices = (
    indices: string[],
    backingIndicesByDataStream: Record<string, string[]> = {}
  ) => {
    client.asCurrentUser.indices.resolveIndex.mockResolvedValue({
      indices: indices.map((name) => ({ name })),
      data_streams: Object.entries(backingIndicesByDataStream).map(([name, backingIndices]) => ({
        name,
        backing_indices: backingIndices,
      })),
    } as IndicesResolveIndexResponse);
  };

  const mockVectorStats = (denseCount: number, sparseCount = 0) => {
    client.asInternalUser.indices.stats.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
      _all: {},
      indices: {
        vectordb: {
          shards: {
            '0': [
              {
                dense_vector: { value_count: denseCount },
                sparse_vector: { value_count: sparseCount },
              },
            ],
          },
        },
      },
    });
  };

  // Both privileges default to granted, and each test drops the one it exercises.
  // vectorCountEnabled defaults to false to match the current constant. Pass true to exercise
  // the canMonitorAllIndices guard independently of the flag.
  const getIndexStats = (
    privileges: Partial<MonitorPrivileges> = {},
    vectorCountEnabled = false,
    isServerless = true
  ) =>
    fetchIndexStats(
      client,
      logger,
      {
        canMonitorAllIndices: true,
        canMonitorCluster: true,
        ...privileges,
      },
      { isServerless, vectorCountEnabled }
    );

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
    mockDocumentCount(0);
    mockCatIndices([]);
    mockMetering([]);
    mockResolvedIndices([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('on a stateful deployment', () => {
    const mockStatefulIndexSizes = (sizes: Record<string, number>) => {
      client.asCurrentUser.indices.stats.mockResolvedValue({
        indices: Object.fromEntries(
          Object.entries(sizes).map(([name, sizeInBytes]) => [
            name,
            { primaries: { store: { total_data_set_size_in_bytes: sizeInBytes } } },
          ])
        ),
      } as IndicesStatsResponse);
    };

    const getStatefulIndexStats = () => getIndexStats({}, false, false);

    // a visible data stream matches the index pattern and expands to its hidden backing indices
    it('counts a user data stream as one index, sized by all of its backing indices', async () => {
      mockStatefulIndexSizes({
        products: 100,
        [APP_LOGS_BACKING_INDICES[0]]: 40,
        [APP_LOGS_BACKING_INDICES[1]]: 10,
      });
      mockResolvedIndices(['products'], { 'logs-app-default': APP_LOGS_BACKING_INDICES });
      mockDocumentCount(30);

      const result = await getStatefulIndexStats();

      expect(result.indicesCount).toBe(2);
      expect(result.storeSizeBytes).toBe(150);
      expect(result.dataPanelAccess).toEqual(FULL_ACCESS);
    });

    // A role with `read` on every index but `monitor` on only some of them counts every index
    // but sizes only those. Here the data stream's backing indices have no size.
    it('hides the total size when the sizes leave out indices that were counted', async () => {
      mockStatefulIndexSizes({ products: 100 });
      mockResolvedIndices(['products'], { 'logs-app-default': APP_LOGS_BACKING_INDICES });
      mockDocumentCount(30);

      const result = await getStatefulIndexStats();

      expect(result.dataPanelAccess).toEqual({
        showPanel: true,
        showDocuments: true,
        showTotalSize: false,
      });
      expect(result.indicesCount).toBe(2);
    });

    // `remote_monitoring_collector` can monitor every index but read only `.monitoring-*`
    it('hides the total size when the sizes cover indices that were not counted', async () => {
      mockStatefulIndexSizes({ products: 100 });
      mockResolvedIndices([]);

      const result = await getStatefulIndexStats();

      expect(result.dataPanelAccess.showTotalSize).toBe(false);
      expect(result.indicesCount).toBe(0);
    });

    it('treats a resolve response without indices or data streams as having none', async () => {
      client.asCurrentUser.indices.resolveIndex.mockResolvedValue(
        {} as IndicesResolveIndexResponse
      );

      const result = await getStatefulIndexStats();

      expect(result.indicesCount).toBe(0);
    });

    it('treats a response without indices as an empty deployment', async () => {
      client.asCurrentUser.indices.stats.mockResolvedValue({} as IndicesStatsResponse);

      const result = await getStatefulIndexStats();

      expect(result.storeSizeBytes).toBe(0);
    });

    // index stats needs `monitor`, which `viewer` and `editor` do not hold
    it('hides only the total size from a caller who cannot monitor any index', async () => {
      client.asCurrentUser.indices.stats.mockRejectedValue(forbidden());
      mockResolvedIndices(['products']);
      mockDocumentCount(20);

      const result = await getStatefulIndexStats();

      expect(result).toEqual({
        dataPanelAccess: { showPanel: true, showDocuments: true, showTotalSize: false },
        indicesCount: 1,
        storeSizeBytes: null,
        vectorCount: null,
        documentsCount: 20,
        newIndex: null,
      });
      expect(logger.warn).not.toHaveBeenCalled();
    });

    // `_resolve/index` needs `read` or `view_index_metadata`, which a caller with only `monitor` lacks
    it('hides the panel from a caller who cannot list any index', async () => {
      client.asCurrentUser.indices.resolveIndex.mockRejectedValue(forbidden());
      mockStatefulIndexSizes({ products: 100 });

      const result = await getStatefulIndexStats();

      expect(result.dataPanelAccess.showPanel).toBe(false);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    // `_count` needs `read`, which a caller with only `view_index_metadata` lacks
    it('hides only the documents from a caller who cannot read any index', async () => {
      client.asCurrentUser.count.mockRejectedValue(forbidden());
      client.asCurrentUser.indices.stats.mockRejectedValue(forbidden());
      mockResolvedIndices(['products']);

      const result = await getStatefulIndexStats();

      expect(result.dataPanelAccess).toEqual({
        showPanel: true,
        showDocuments: false,
        showTotalSize: false,
      });
      expect(result.indicesCount).toBe(1);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('keeps the panel but reports a null size when the index stats call fails', async () => {
      client.asCurrentUser.indices.stats.mockRejectedValue(new Error('stats down'));
      mockResolvedIndices(['products']);
      mockDocumentCount(20);

      const result = await getStatefulIndexStats();

      expect(result.dataPanelAccess).toEqual(FULL_ACCESS);
      expect(result.indicesCount).toBe(1);
      expect(result.storeSizeBytes).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('fetch index sizes'));
    });

    it('keeps the panel but reports a null index count when the indices lookup fails', async () => {
      client.asCurrentUser.indices.resolveIndex.mockRejectedValue(new Error('resolve down'));
      mockStatefulIndexSizes({ products: 100 });

      const result = await getStatefulIndexStats();

      expect(result.dataPanelAccess).toEqual(FULL_ACCESS);
      expect(result.indicesCount).toBeNull();
      expect(result.storeSizeBytes).toBe(100);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('count indices'));
    });
  });

  // system indices and the backing indices of system and internal data streams are left out by the
  // request itself
  it('asks metering only for user indices and user data streams', async () => {
    await getIndexStats();

    expect(client.asSecondaryAuthUser.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_metering/stats/*,-.*,-traces-agent_builder.otel-*',
    });
  });

  // the count and sizes come from the same call, so they cover the same indices
  it('counts each user data stream as one index, sized by all of its backing indices', async () => {
    mockMetering(
      [
        { name: 'products', num_docs: 10, size_in_bytes: 100 },
        {
          name: APP_LOGS_BACKING_INDICES[0],
          num_docs: 50,
          size_in_bytes: 500,
          datastream: 'logs-app-default',
        },
        {
          name: APP_LOGS_BACKING_INDICES[1],
          num_docs: 5,
          size_in_bytes: 50,
          datastream: 'logs-app-default',
        },
      ],
      ['logs-app-default']
    );

    const result = await getIndexStats();

    expect(result).toEqual({
      dataPanelAccess: FULL_ACCESS,
      indicesCount: 2,
      storeSizeBytes: 650,
      vectorCount: null,
      documentsCount: 0,
      newIndex: null,
    });
    expect(client.asCurrentUser.indices.resolveIndex).not.toHaveBeenCalled();
  });

  // metering needs `monitor`, `view_index_metadata`, `manage`, or `all` on at least one index
  it('hides the panel from a caller who cannot meter any index', async () => {
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(forbidden());
    mockDocumentCount(10);

    const result = await getIndexStats();

    expect(result).toEqual({
      dataPanelAccess: { showPanel: false, showDocuments: false, showTotalSize: false },
      indicesCount: null,
      storeSizeBytes: null,
      vectorCount: null,
      documentsCount: 10,
      newIndex: null,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  // `_count` needs `read` or `all`, which `monitor` and `view_index_metadata` do not include
  it('hides only the documents from a caller who cannot read any index', async () => {
    mockMetering([{ name: 'products', num_docs: 10, size_in_bytes: 100 }]);
    client.asCurrentUser.count.mockRejectedValue(forbidden());

    const result = await getIndexStats();

    expect(result).toEqual({
      dataPanelAccess: { showPanel: true, showDocuments: false, showTotalSize: true },
      indicesCount: 1,
      storeSizeBytes: 100,
      vectorCount: null,
      documentsCount: null,
      newIndex: null,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  // a size of 0 would claim the new index is empty
  it('reports a null new index size when the sizes are unavailable', async () => {
    mockCatIndices([{ index: 'brand-new', 'creation.date': String(Date.now() - 60_000) }]);
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(new Error('metering down'));
    mockDocumentCount(3);

    const result = await getIndexStats();

    expect(result.newIndex).toEqual(
      expect.objectContaining({ indexName: 'brand-new', documentsCount: 3, sizeInBytes: null })
    );
  });

  // the panel and the total size stat read the same source, so they agree
  it('takes the new index size from the metering stats', async () => {
    mockCatIndices([{ index: 'brand-new', 'creation.date': String(Date.now() - 60_000) }]);
    mockMetering([{ name: 'brand-new', num_docs: 3, size_in_bytes: 46121 }]);
    mockDocumentCount(3);

    const result = await getIndexStats();

    expect(result.newIndex).toEqual(
      expect.objectContaining({ indexName: 'brand-new', sizeInBytes: 46121 })
    );
  });

  it('does not fetch vector counts while they are disabled', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockDocumentCount(20);
    mockVectorStats(100, 25);

    const result = await getIndexStats();

    expect(result.vectorCount).toBeNull();
    expect(client.asInternalUser.indices.stats).not.toHaveBeenCalled();
  });

  it('skips the vector lookup entirely when the caller cannot monitor every index', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockDocumentCount(20);

    // pass true so the canMonitorAllIndices guard is exercised independently of the feature flag
    const result = await getIndexStats({ canMonitorAllIndices: false }, true);

    // The scoped counts still resolve. Only the cluster-wide vector total is withheld.
    expect(result).toEqual({
      dataPanelAccess: FULL_ACCESS,
      indicesCount: 1,
      storeSizeBytes: 500,
      vectorCount: null,
      documentsCount: 20,
      newIndex: null,
    });
    expect(client.asInternalUser.indices.stats).not.toHaveBeenCalled();
  });

  // `_cat/indices` needs cluster `monitor`, which the caller does not hold here
  it('skips the newest-index lookup when the caller cannot monitor the cluster', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockCatIndices([{ index: 'vectordb', 'creation.date': String(Date.now() - 60_000) }]);
    mockDocumentCount(20);

    const result = await getIndexStats({ canMonitorCluster: false });

    expect(result.newIndex).toBeNull();
    expect(client.asCurrentUser.cat.indices).not.toHaveBeenCalled();
  });

  // cluster `monitor` gates the newest-index lookup on its own, independent of index `monitor` on *
  it('surfaces the newest index for a caller that can monitor the cluster but not every index', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockCatIndices([{ index: 'vectordb', 'creation.date': String(Date.now() - 60_000) }]);
    mockDocumentCount(20);

    const result = await getIndexStats({ canMonitorAllIndices: false });

    expect(result.newIndex).toEqual(expect.objectContaining({ indexName: 'vectordb' }));
  });

  it('keeps the panel but reports a null index count and size when the metering call fails', async () => {
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(new Error('metering down'));
    mockDocumentCount(20);

    const result = await getIndexStats();

    // a size of 0 would claim the deployment is empty, so the reads that do not depend on metering
    // still run
    expect(result).toEqual({
      dataPanelAccess: FULL_ACCESS,
      indicesCount: null,
      storeSizeBytes: null,
      vectorCount: null,
      documentsCount: 20,
      newIndex: null,
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('fetch metered indices'));
  });

  it('treats an index_not_found_exception from metering as an empty deployment', async () => {
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(
      Object.assign(new Error('no metering data'), {
        statusCode: 404,
        body: { error: { type: 'index_not_found_exception' } },
      })
    );

    const result = await getIndexStats();

    // a project metering has never reported on is empty, not broken
    expect(result.indicesCount).toBe(0);
    expect(result.storeSizeBytes).toBe(0);
    expect(result.dataPanelAccess).toEqual(FULL_ACCESS);
  });

  it('reports a null size for a 404 that is not an index_not_found_exception', async () => {
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(
      Object.assign(new Error('no handler found for uri [/_metering/stats]'), { statusCode: 404 })
    );
    mockDocumentCount(20);

    const result = await getIndexStats();

    // a metering API that is not there at all says nothing about how much data exists
    expect(result.storeSizeBytes).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('treats a metering response without indices as an empty deployment', async () => {
    client.asSecondaryAuthUser.transport.request.mockResolvedValue({
      _total: { num_docs: 0, size_in_bytes: 0 },
    });

    const result = await getIndexStats();

    expect(result).toEqual({
      dataPanelAccess: FULL_ACCESS,
      indicesCount: 0,
      storeSizeBytes: 0,
      vectorCount: null,
      documentsCount: 0,
      newIndex: null,
    });
  });

  it('treats an index reported without a size as contributing nothing to the total', async () => {
    client.asSecondaryAuthUser.transport.request.mockResolvedValue({
      _total: { num_docs: 10, size_in_bytes: 100 },
      indices: [
        { name: 'sizeless', num_docs: 10 },
        { name: 'products', num_docs: 10, size_in_bytes: 100 },
      ],
    });

    const result = await getIndexStats();

    expect(result.storeSizeBytes).toBe(100);
  });

  it('counts top-level documents in user indices and data streams rather than reusing the metering num_docs', async () => {
    // metering counts the hidden nested docs that `semantic_text` chunking creates
    mockMetering([{ name: 'vectordb', num_docs: 5000, size_in_bytes: 500 }]);
    mockDocumentCount(500);

    const result = await getIndexStats();

    // the open-only pattern resolves to user indices and user data streams, so no query is needed
    expect(client.asCurrentUser.count).toHaveBeenCalledWith({
      index: USER_INDICES_PATTERN,
      expand_wildcards: ['open'],
    });
    expect(result.documentsCount).toBe(500);
  });

  it('returns a null documentsCount when shards fail, rather than an undercount', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 5000, size_in_bytes: 500 }]);
    mockDocumentCount(120, 1);

    const result = await getIndexStats();

    expect(result.documentsCount).toBeNull();
    // a partial count resolves rather than throwing, so it needs its own warning
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1 of 2 shards'));
  });

  it('returns a null documentsCount (not 0) when the count call fails', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    client.asCurrentUser.count.mockRejectedValue(new Error('boom'));

    const result = await getIndexStats();

    // The index and size counts are still valid. Only the document count is unavailable.
    expect(result).toEqual({
      dataPanelAccess: FULL_ACCESS,
      indicesCount: 1,
      storeSizeBytes: 500,
      vectorCount: null,
      documentsCount: null,
      newIndex: null,
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('compute document count'));
  });
});

describe('fetchNewIndex', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
    mockIndexCount(0);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockIndexCount = (count: number) => {
    client.asCurrentUser.count.mockResolvedValue({
      count,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    });
  };

  const now = Date.now();
  const hoursAgo = (hours: number) => now - hours * 60 * 60 * 1000;

  const created = (name: string, createdHoursAgo: number) => ({
    index: name,
    'creation.date': String(hoursAgo(createdHoursAgo)),
  });

  const mockCatIndices = (indices: Array<ReturnType<typeof created>>) => {
    client.asCurrentUser.cat.indices.mockResolvedValue(indices);
  };

  it('returns the newest index created within the last 24 hours', async () => {
    mockCatIndices([created('new-index', 1), created('old-index', 48)]);
    mockIndexCount(100);

    const result = await fetchNewIndex(client, logger);

    expect(result).toEqual({
      indexName: 'new-index',
      documentsCount: 100,
      createdAt: hoursAgo(1),
    });
  });

  // every rollover creates a backing index, which would otherwise surface as a new index
  it('ignores data stream backing indices', async () => {
    mockCatIndices([created('.ds-logs-app-default-2026.10.21-000002', 1), created('products', 6)]);
    mockIndexCount(7);

    const result = await fetchNewIndex(client, logger);

    expect(result!.indexName).toBe('products');
  });

  it('returns null when every index is older than 24 hours', async () => {
    mockCatIndices([created('old-index', 48)]);

    const result = await fetchNewIndex(client, logger);

    expect(result).toBeNull();
    expect(client.asCurrentUser.count).not.toHaveBeenCalled();
  });

  it('skips an index reported without a creation date', async () => {
    client.asCurrentUser.cat.indices.mockResolvedValue([{ index: 'undated' }]);

    const result = await fetchNewIndex(client, logger);

    expect(result).toBeNull();
  });

  it('picks the newest when several indices fall inside the window', async () => {
    mockCatIndices([created('older-index', 12), created('newest-index', 1), created('middle', 6)]);
    mockIndexCount(50);

    const result = await fetchNewIndex(client, logger);

    expect(result!.indexName).toBe('newest-index');
    expect(client.asCurrentUser.count).toHaveBeenCalledWith({ index: 'newest-index' });
  });

  it('returns null and logs when the index listing fails', async () => {
    client.asCurrentUser.cat.indices.mockRejectedValue(new Error('boom'));

    const result = await fetchNewIndex(client, logger);

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  // cluster `monitor` alone gets the listing called, but it also needs index `monitor`
  it('returns null without logging when the caller cannot monitor any index', async () => {
    client.asCurrentUser.cat.indices.mockRejectedValue(
      Object.assign(new Error('forbidden'), { statusCode: 403 })
    );

    const result = await fetchNewIndex(client, logger);

    expect(result).toBeNull();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns null and logs when the document count fails', async () => {
    mockCatIndices([created('my-index', 1)]);
    client.asCurrentUser.count.mockRejectedValue(new Error('boom'));

    const result = await fetchNewIndex(client, logger);

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('fetchApiKeysStats', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('counts the same keys as the Stack Management API keys list', async () => {
    client.asCurrentUser.security.queryApiKeys.mockResolvedValue({
      total: 4,
      count: 0,
      api_keys: [],
      aggregations: { expiring: { doc_count: 2 } },
    });

    await expect(fetchApiKeysStats(client, logger)).resolves.toEqual({ total: 4, expiring: 2 });

    // keys Kibana creates on the user's behalf are hidden from that list, so they aren't counted
    expect(client.asCurrentUser.security.queryApiKeys).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 0,
        query: {
          bool: {
            must: [{ term: { invalidated: false } }, { term: { type: 'rest' } }],
            must_not: [
              { prefix: { name: { value: 'Alerting: ' } } },
              { term: { 'metadata.managed': true } },
            ],
          },
        },
      })
    );
  });

  // an unbounded `expiration > now` would also count keys that are not due for months
  it('counts only the keys expiring within the next 30 days', async () => {
    client.asCurrentUser.security.queryApiKeys.mockResolvedValue({
      total: 4,
      count: 0,
      api_keys: [],
      aggregations: { expiring: { doc_count: 2 } },
    });

    await fetchApiKeysStats(client, logger);

    expect(client.asCurrentUser.security.queryApiKeys).toHaveBeenCalledWith(
      expect.objectContaining({
        aggs: {
          expiring: { filter: { range: { expiration: { gt: 'now', lte: 'now+30d' } } } },
        },
      })
    );
  });

  it('reports 0 expiring keys when the aggregation is missing from the response', async () => {
    client.asCurrentUser.security.queryApiKeys.mockResolvedValue({
      total: 2,
      count: 0,
      api_keys: [],
    });

    await expect(fetchApiKeysStats(client, logger)).resolves.toEqual({ total: 2, expiring: 0 });
  });

  it('returns null values (not zeros) and logs when the lookup fails', async () => {
    client.asCurrentUser.security.queryApiKeys.mockRejectedValue(new Error('forbidden'));

    await expect(fetchApiKeysStats(client, logger)).resolves.toEqual({
      total: null,
      expiring: null,
    });
    expect(logger.warn).toHaveBeenCalled();
  });
});
