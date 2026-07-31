/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hasLegacySecurityAssets,
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

jest.mock('../../infra/elasticsearch', () => ({
  createDataStream: jest.fn(),
  createIndex: jest.fn(),
  deleteComponentTemplate: jest.fn(),
  deleteDataStream: jest.fn(),
  deleteIndex: jest.fn(),
  deleteIndexTemplate: jest.fn(),
  reindex: jest.fn(),
}));

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
    error: jest.fn(),
  } as any;

  const esClient = {
    indices: {
      exists: jest.fn(),
      updateAliases: jest.fn(),
    },
    ingest: {
      deletePipeline: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateIndex.mockResolvedValue(undefined as any);
    mockCreateDataStream.mockResolvedValue(undefined as any);
    mockDeleteIndex.mockResolvedValue(undefined as any);
    mockDeleteDataStream.mockResolvedValue(undefined as any);
    mockReindex.mockResolvedValue({ created: 1, total: 1 });
    mockDeleteComponentTemplate.mockResolvedValue(undefined as any);
    mockDeleteIndexTemplate.mockResolvedValue(undefined as any);
    esClient.indices.updateAliases.mockResolvedValue({});
    esClient.ingest.deletePipeline.mockResolvedValue({});
  });

  it('returns false from hasLegacySecurityAssets when no legacy assets exist', async () => {
    esClient.indices.exists.mockResolvedValue(false);
    await expect(hasLegacySecurityAssets(esClient, namespace)).resolves.toBe(false);
  });

  it('migrates legacy latest index into the neutral name and deletes legacy', async () => {
    const legacyIndex = getLegacySecurityLatestEntitiesIndexName(namespace);
    const newIndex = getLatestEntitiesIndexName(namespace);

    esClient.indices.exists.mockImplementation(async ({ index }: { index: string }) => {
      if (index === legacyIndex) return true;
      if (index === `.entities.v2.updates.security_${namespace}`) return false;
      if (index === `.entities.v2.metadata.security_${namespace}`) return false;
      if (index === newIndex) return false;
      if (index === `.entities.v2.updates.${namespace}`) return false;
      if (index === `.entities.v2.metadata.${namespace}`) return false;
      return false;
    });

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
        dest: { index: newIndex },
      })
    );
    expect(esClient.indices.updateAliases).toHaveBeenCalled();
    expect(mockDeleteIndex).toHaveBeenCalledWith(esClient, legacyIndex);
  });

  it('is a no-op when only neutral assets exist', async () => {
    esClient.indices.exists.mockResolvedValue(false);

    await migrateLegacySecurityAssets({ esClient, logger, namespace });

    expect(mockCreateIndex).not.toHaveBeenCalled();
    expect(mockReindex).not.toHaveBeenCalled();
    expect(mockDeleteIndex).not.toHaveBeenCalled();
  });
});
