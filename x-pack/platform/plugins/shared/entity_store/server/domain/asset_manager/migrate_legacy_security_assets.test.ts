/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ensureLegacyCompatibilityAliases,
  hasCollidingNeutralNamespaceAssets,
  hasLegacySecurityAssets,
  isConcreteIndexOrDataStream,
  migrateLegacySecurityAssets,
} from './migrate_legacy_security_assets';
import {
  createDataStream,
  createIndex,
  deleteComponentTemplate,
  deleteDataStream,
  deleteIndex,
  deleteIndexTemplate,
  reindex,
} from '../../infra/elasticsearch';
import {
  getLatestEntitiesIndexName,
  getLegacySecurityLatestEntitiesIndexName,
} from '../../../common/domain/entity_index';

jest.mock('../../infra/elasticsearch', () => {
  const { assertReindexSucceeded } = jest.requireActual('../../infra/elasticsearch/reindex');
  return {
    assertReindexSucceeded,
    createDataStream: jest.fn(),
    createIndex: jest.fn(),
    deleteComponentTemplate: jest.fn(),
    deleteDataStream: jest.fn(),
    deleteIndex: jest.fn(),
    deleteIndexTemplate: jest.fn(),
    reindex: jest.fn(),
  };
});

const mockCreateDataStream = createDataStream as jest.MockedFunction<typeof createDataStream>;
const mockCreateIndex = createIndex as jest.MockedFunction<typeof createIndex>;
const mockDeleteDataStream = deleteDataStream as jest.MockedFunction<typeof deleteDataStream>;
const mockDeleteIndex = deleteIndex as jest.MockedFunction<typeof deleteIndex>;
const mockReindex = reindex as jest.MockedFunction<typeof reindex>;
const mockDeleteComponentTemplate = deleteComponentTemplate as jest.MockedFunction<
  typeof deleteComponentTemplate
>;
const mockDeleteIndexTemplate = deleteIndexTemplate as jest.MockedFunction<
  typeof deleteIndexTemplate
>;

describe('migrateLegacySecurityAssets', () => {
  const namespace = 'default';
  const logger = {
    get: () => logger,
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;

  const esClient = {
    indices: {
      exists: jest.fn(),
      get: jest.fn(),
      getDataStream: jest.fn(),
      getAlias: jest.fn(),
      updateAliases: jest.fn(),
      resolveIndex: jest.fn(),
    },
    ingest: {
      deletePipeline: jest.fn(),
    },
  } as any;

  const notFoundError = () =>
    Object.assign(new Error('index_not_found_exception'), { meta: { statusCode: 404 } });

  const mockConcrete = (concreteNames: string[]) => {
    const concrete = new Set(concreteNames);
    esClient.indices.getDataStream.mockImplementation(async ({ name }: { name: string }) => {
      if (concrete.has(name) && name.includes('metadata')) {
        return { data_streams: [{ name }] };
      }
      if (concrete.has(name) && name.includes('updates')) {
        return { data_streams: [{ name }] };
      }
      throw notFoundError();
    });
    esClient.indices.get.mockImplementation(async ({ index }: { index: string }) => {
      if (concrete.has(index)) {
        return { [index]: {} };
      }
      throw notFoundError();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateIndex.mockResolvedValue(undefined as any);
    mockCreateDataStream.mockResolvedValue(undefined as any);
    mockDeleteIndex.mockResolvedValue(undefined as any);
    mockDeleteDataStream.mockResolvedValue(undefined as any);
    mockReindex.mockResolvedValue({
      created: 1,
      updated: 0,
      versionConflicts: 0,
      total: 1,
      failures: [],
    });
    mockDeleteComponentTemplate.mockResolvedValue(undefined as any);
    mockDeleteIndexTemplate.mockResolvedValue(undefined as any);
    esClient.indices.updateAliases.mockResolvedValue({});
    esClient.indices.getAlias.mockRejectedValue({ meta: { statusCode: 404 } });
    esClient.indices.resolveIndex.mockResolvedValue({ indices: [], aliases: [], data_streams: [] });
    esClient.ingest.deletePipeline.mockResolvedValue({});
  });

  it('returns false from hasLegacySecurityAssets when no legacy assets exist', async () => {
    mockConcrete([]);
    await expect(hasLegacySecurityAssets(esClient, namespace)).resolves.toBe(false);
  });

  it('returns false when candidate names belong to space security_{namespace}', async () => {
    const collidingNamespace = `security_${namespace}`;
    const collidingLatest = getLegacySecurityLatestEntitiesIndexName(namespace);
    mockConcrete([collidingLatest]);
    esClient.indices.getAlias.mockImplementation(async ({ name }: { name: string }) => {
      if (name === `entities-latest-${collidingNamespace}`) {
        return { [collidingLatest]: { aliases: { [name]: {} } } };
      }
      throw notFoundError();
    });

    await expect(hasCollidingNeutralNamespaceAssets(esClient, namespace)).resolves.toBe(true);
    await expect(hasLegacySecurityAssets(esClient, namespace)).resolves.toBe(false);
  });

  it('does not migrate or delete when assets belong to space security_{namespace}', async () => {
    const collidingNamespace = `security_${namespace}`;
    const collidingLatest = getLegacySecurityLatestEntitiesIndexName(namespace);
    const collidingMetadata = `.entities.v2.metadata.security_${namespace}`;
    mockConcrete([collidingLatest, collidingMetadata]);
    esClient.indices.getAlias.mockImplementation(async ({ name }: { name: string }) => {
      if (name === `entities-latest-${collidingNamespace}`) {
        return { [collidingLatest]: { aliases: { [name]: {} } } };
      }
      throw notFoundError();
    });

    await migrateLegacySecurityAssets({ esClient, logger, namespace });

    expect(mockCreateIndex).not.toHaveBeenCalled();
    expect(mockReindex).not.toHaveBeenCalled();
    expect(mockDeleteIndex).not.toHaveBeenCalled();
    expect(mockDeleteDataStream).not.toHaveBeenCalled();
    expect(mockDeleteIndexTemplate).not.toHaveBeenCalled();
  });

  it('returns false from hasLegacySecurityAssets when only compatibility aliases exist', async () => {
    // Alias-only: getDataStream/get do not key by the legacy name.
    esClient.indices.getDataStream.mockRejectedValue({ meta: { statusCode: 404 } });
    esClient.indices.get.mockImplementation(async ({ index }: { index: string }) => {
      if (index === `.entities.v2.metadata.security_${namespace}`) {
        return { [`.entities.v2.metadata.${namespace}`]: { aliases: { [index]: {} } } };
      }
      throw notFoundError();
    });

    await expect(hasLegacySecurityAssets(esClient, namespace)).resolves.toBe(false);
  });

  it('isConcreteIndexOrDataStream is true only for concrete names', async () => {
    mockConcrete([`.entities.v2.latest.security_${namespace}-00001`]);
    await expect(
      isConcreteIndexOrDataStream(esClient, `.entities.v2.latest.security_${namespace}-00001`)
    ).resolves.toBe(true);
    await expect(
      isConcreteIndexOrDataStream(esClient, `.entities.v2.latest.security_${namespace}`)
    ).resolves.toBe(false);
  });

  it('migrates legacy latest index into the neutral name and deletes legacy', async () => {
    const legacyIndex = getLegacySecurityLatestEntitiesIndexName(namespace);
    const newIndex = getLatestEntitiesIndexName(namespace);

    mockConcrete([legacyIndex]);

    await migrateLegacySecurityAssets({ esClient, logger, namespace });

    expect(mockCreateIndex).toHaveBeenCalledWith(
      esClient,
      newIndex,
      expect.objectContaining({ throwIfExists: false })
    );
    expect(mockReindex).toHaveBeenCalledWith(
      esClient,
      expect.objectContaining({
        source: { index: legacyIndex },
        dest: { index: newIndex, op_type: 'create' },
        waitForTask: expect.objectContaining({ forever: true }),
      })
    );
    expect(esClient.indices.updateAliases).toHaveBeenCalled();
    expect(mockDeleteIndex).toHaveBeenCalledWith(esClient, legacyIndex);
    expect(esClient.indices.updateAliases).toHaveBeenCalledWith({
      actions: [
        {
          add: {
            index: newIndex,
            alias: `.entities.v2.latest.security_${namespace}`,
          },
        },
      ],
    });
  });

  it('reindexes latest again when neutral index already exists but legacy remains', async () => {
    const legacyIndex = getLegacySecurityLatestEntitiesIndexName(namespace);
    const newIndex = getLatestEntitiesIndexName(namespace);

    mockConcrete([legacyIndex, newIndex]);

    await migrateLegacySecurityAssets({ esClient, logger, namespace });

    expect(mockCreateIndex).toHaveBeenCalledWith(
      esClient,
      newIndex,
      expect.objectContaining({ throwIfExists: false })
    );
    expect(mockReindex).toHaveBeenCalledWith(
      esClient,
      expect.objectContaining({
        source: { index: legacyIndex },
        dest: { index: newIndex, op_type: 'create' },
        waitForTask: expect.objectContaining({ forever: true }),
      })
    );
    expect(mockDeleteIndex).toHaveBeenCalledWith(esClient, legacyIndex);
  });

  it('treats version conflicts as success when latest reindex uses op_type create', async () => {
    const legacyIndex = getLegacySecurityLatestEntitiesIndexName(namespace);
    mockConcrete([legacyIndex]);
    // Concurrent extract/CRUD already wrote some of the same _ids into the neutral
    // index; create conflicts must not block delete of the legacy source.
    mockReindex.mockResolvedValue({
      created: 2,
      updated: 0,
      versionConflicts: 3,
      total: 5,
      failures: [],
    });

    await migrateLegacySecurityAssets({ esClient, logger, namespace });

    expect(mockReindex).toHaveBeenCalledWith(
      esClient,
      expect.objectContaining({
        dest: { index: getLatestEntitiesIndexName(namespace), op_type: 'create' },
      })
    );
    expect(mockDeleteIndex).toHaveBeenCalledWith(esClient, legacyIndex);
  });

  it('deletes legacy updates data stream without recreating the neutral stream', async () => {
    const legacyUpdates = `.entities.v2.updates.security_${namespace}`;

    mockConcrete([legacyUpdates]);

    await migrateLegacySecurityAssets({ esClient, logger, namespace });

    expect(mockDeleteDataStream).toHaveBeenCalledWith(esClient, legacyUpdates);
    expect(mockCreateDataStream).not.toHaveBeenCalledWith(
      esClient,
      `.entities.v2.updates.${namespace}`,
      expect.anything()
    );
  });

  it('reindexes metadata into the data stream with op_type create', async () => {
    const legacyMetadata = `.entities.v2.metadata.security_${namespace}`;
    const newMetadata = `.entities.v2.metadata.${namespace}`;

    mockConcrete([legacyMetadata]);

    await migrateLegacySecurityAssets({ esClient, logger, namespace });

    expect(mockCreateDataStream).toHaveBeenCalledWith(
      esClient,
      newMetadata,
      expect.objectContaining({ throwIfExists: false })
    );
    expect(mockReindex).toHaveBeenCalledWith(
      esClient,
      expect.objectContaining({
        source: { index: legacyMetadata },
        dest: { index: newMetadata, op_type: 'create' },
        waitForTask: expect.objectContaining({ forever: true }),
      })
    );
    expect(mockDeleteDataStream).toHaveBeenCalledWith(esClient, legacyMetadata);
    expect(esClient.indices.updateAliases).toHaveBeenCalledWith({
      actions: [{ add: { index: newMetadata, alias: legacyMetadata } }],
    });
  });

  it('does not delete legacy latest when reindex reports document failures', async () => {
    const legacyIndex = getLegacySecurityLatestEntitiesIndexName(namespace);
    mockConcrete([legacyIndex]);
    mockReindex.mockResolvedValue({
      created: 0,
      updated: 0,
      versionConflicts: 0,
      total: 1,
      failures: [
        {
          index: legacyIndex,
          id: 'doc-1',
          status: 400,
          cause: { type: 'mapper_parsing_exception' },
        },
      ],
    });

    await expect(migrateLegacySecurityAssets({ esClient, logger, namespace })).rejects.toThrow(
      /document failure/
    );
    expect(mockDeleteIndex).not.toHaveBeenCalled();
  });

  it('migrates legacy history snapshot indices to neutral names', async () => {
    const legacyHistory = `.entities.v2.history.security_${namespace}.2026-08-01-12`;
    const newHistory = `.entities.v2.history.${namespace}.2026-08-01-12`;

    mockConcrete([]);
    esClient.indices.resolveIndex.mockResolvedValue({
      indices: [{ name: legacyHistory }],
      aliases: [],
      data_streams: [],
    });

    await migrateLegacySecurityAssets({ esClient, logger, namespace });

    expect(mockCreateIndex).toHaveBeenCalledWith(
      esClient,
      newHistory,
      expect.objectContaining({ throwIfExists: false })
    );
    expect(mockReindex).toHaveBeenCalledWith(
      esClient,
      expect.objectContaining({
        source: { index: legacyHistory },
        dest: { index: newHistory },
        waitForTask: expect.objectContaining({ forever: true }),
      })
    );
    expect(mockDeleteIndex).toHaveBeenCalledWith(esClient, legacyHistory);
  });

  it('deletes index templates before component templates', async () => {
    const legacyIndex = getLegacySecurityLatestEntitiesIndexName(namespace);
    mockConcrete([legacyIndex]);

    const callOrder: string[] = [];
    mockDeleteIndexTemplate.mockImplementation(async () => {
      callOrder.push('indexTemplate');
      return undefined as any;
    });
    mockDeleteComponentTemplate.mockImplementation(async () => {
      callOrder.push('componentTemplate');
      return undefined as any;
    });

    await migrateLegacySecurityAssets({ esClient, logger, namespace });

    const firstIndexTemplate = callOrder.indexOf('indexTemplate');
    const firstComponentTemplate = callOrder.indexOf('componentTemplate');
    expect(firstIndexTemplate).toBeGreaterThanOrEqual(0);
    expect(firstComponentTemplate).toBeGreaterThanOrEqual(0);
    expect(firstIndexTemplate).toBeLessThan(firstComponentTemplate);
  });

  it('is a no-op when only neutral assets exist', async () => {
    mockConcrete([]);

    await migrateLegacySecurityAssets({ esClient, logger, namespace });

    expect(mockCreateIndex).not.toHaveBeenCalled();
    expect(mockReindex).not.toHaveBeenCalled();
    expect(mockDeleteIndex).not.toHaveBeenCalled();
  });

  it('ensureLegacyCompatibilityAliases adds aliases when neutral assets exist and legacy is gone', async () => {
    const newIndex = getLatestEntitiesIndexName(namespace);
    const newMetadata = `.entities.v2.metadata.${namespace}`;
    mockConcrete([newIndex, newMetadata]);

    await ensureLegacyCompatibilityAliases({ esClient, logger, namespace });

    expect(esClient.indices.updateAliases).toHaveBeenCalledWith({
      actions: [
        {
          add: {
            index: newIndex,
            alias: `.entities.v2.latest.security_${namespace}`,
          },
        },
      ],
    });
    expect(esClient.indices.updateAliases).toHaveBeenCalledWith({
      actions: [
        {
          add: {
            index: newMetadata,
            alias: `.entities.v2.metadata.security_${namespace}`,
          },
        },
      ],
    });
  });

  it('ensureLegacyCompatibilityAliases skips when legacy concrete latest still exists', async () => {
    const legacyIndex = getLegacySecurityLatestEntitiesIndexName(namespace);
    const newIndex = getLatestEntitiesIndexName(namespace);
    mockConcrete([legacyIndex, newIndex]);

    await ensureLegacyCompatibilityAliases({ esClient, logger, namespace });

    expect(esClient.indices.updateAliases).not.toHaveBeenCalled();
  });

  it('ensureLegacyCompatibilityAliases warns and does not throw when updateAliases is unauthorized', async () => {
    const newIndex = getLatestEntitiesIndexName(namespace);
    const newMetadata = `.entities.v2.metadata.${namespace}`;
    mockConcrete([newIndex, newMetadata]);
    esClient.indices.updateAliases.mockRejectedValue(
      new Error(
        'security_exception: action [indices:admin/aliases] is unauthorized for service account [elastic/kibana]'
      )
    );

    await expect(
      ensureLegacyCompatibilityAliases({ esClient, logger, namespace })
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not add legacy compatibility alias')
    );
  });
});
