/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { uninstallElasticsearchAssets } from './install_assets';
import {
  getLatestEntitiesIndexName,
  getLegacySecurityLatestEntitiesIndexName,
} from '../../../common/domain/entity_index';
import {
  getHistorySnapshotIndexName,
  getHistorySnapshotIndexPattern,
  getLegacySecurityHistorySnapshotIndexPattern,
} from './history_snapshot_index';
import {
  getUpdatesEntitiesDataStreamName,
  getLegacySecurityUpdatesEntitiesDataStreamName,
  getLegacySecurityUpdatesIndexTemplateId,
} from './updates_data_stream';
import { getUpdatesComponentTemplateName } from './component_templates';
import {
  getMetadataEntitiesDataStreamName,
  getLegacySecurityMetadataEntitiesDataStreamName,
} from './metadata_data_stream';
import { ALL_ENTITY_TYPES } from '../../../common/domain/definitions/entity_schema';

jest.mock('../../infra/elasticsearch');

const { deleteIndex, deleteDataStream, deleteIndexTemplate, deleteComponentTemplate } =
  jest.requireMock('../../infra/elasticsearch') as {
    deleteIndex: jest.Mock;
    deleteDataStream: jest.Mock;
    deleteIndexTemplate: jest.Mock;
    deleteComponentTemplate: jest.Mock;
  };

describe('uninstallElasticsearchAssets', () => {
  const namespace = 'default';
  const historyPattern = getHistorySnapshotIndexPattern(namespace);
  const legacyHistoryPattern = getLegacySecurityHistorySnapshotIndexPattern(namespace);
  const historyIndexA = getHistorySnapshotIndexName(namespace, new Date('2026-07-29T10:00:00Z'));
  const historyIndexB = getHistorySnapshotIndexName(namespace, new Date('2026-07-29T11:00:00Z'));

  const createEsClient = (historyIndices: string[] = [historyIndexA, historyIndexB]) => ({
    indices: {
      getAlias: jest.fn().mockRejectedValue({ meta: { statusCode: 404 } }),
      resolveIndex: jest.fn().mockImplementation(async ({ name }: { name: string }) => {
        if (name === historyPattern) {
          return {
            indices: historyIndices.map((indexName) => ({ name: indexName })),
            aliases: [],
            data_streams: [],
          };
        }
        return { indices: [], aliases: [], data_streams: [] };
      }),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    deleteIndex.mockResolvedValue(undefined);
    deleteDataStream.mockResolvedValue(undefined);
    deleteIndexTemplate.mockResolvedValue(undefined);
    deleteComponentTemplate.mockResolvedValue(undefined);
  });

  it('deletes the latest entities index', async () => {
    await uninstallElasticsearchAssets({
      esClient: createEsClient() as unknown as ElasticsearchClient,
      logger: loggerMock.create(),
      namespace,
    });

    expect(deleteIndex).toHaveBeenCalledWith(
      expect.anything(),
      getLatestEntitiesIndexName(namespace)
    );
    expect(deleteIndex).toHaveBeenCalledWith(
      expect.anything(),
      getLegacySecurityLatestEntitiesIndexName(namespace)
    );
  });

  it('resolves history snapshot wildcards then deletes concrete index names', async () => {
    const esClient = createEsClient([historyIndexA, historyIndexB]);

    await uninstallElasticsearchAssets({
      esClient: esClient as unknown as ElasticsearchClient,
      logger: loggerMock.create(),
      namespace,
    });

    expect(esClient.indices.resolveIndex).toHaveBeenCalledWith({
      name: historyPattern,
    });
    expect(esClient.indices.resolveIndex).toHaveBeenCalledWith({
      name: legacyHistoryPattern,
    });
    // Must not pass the wildcard pattern to delete — ES rejects it when
    // action.destructive_requires_name=true.
    expect(deleteIndex).not.toHaveBeenCalledWith(expect.anything(), historyPattern);
    expect(deleteIndex).not.toHaveBeenCalledWith(expect.anything(), legacyHistoryPattern);
    expect(deleteIndex).toHaveBeenCalledWith(expect.anything(), historyIndexA);
    expect(deleteIndex).toHaveBeenCalledWith(expect.anything(), historyIndexB);
  });

  it('skips history index delete when no history indices exist', async () => {
    await uninstallElasticsearchAssets({
      esClient: createEsClient([]) as unknown as ElasticsearchClient,
      logger: loggerMock.create(),
      namespace,
    });

    expect(deleteIndex).toHaveBeenCalledTimes(2);
    expect(deleteIndex).toHaveBeenCalledWith(
      expect.anything(),
      getLatestEntitiesIndexName(namespace)
    );
    expect(deleteIndex).toHaveBeenCalledWith(
      expect.anything(),
      getLegacySecurityLatestEntitiesIndexName(namespace)
    );
  });

  it('deletes the updates data stream', async () => {
    await uninstallElasticsearchAssets({
      esClient: createEsClient() as unknown as ElasticsearchClient,
      logger: loggerMock.create(),
      namespace,
    });

    expect(deleteDataStream).toHaveBeenCalledWith(
      expect.anything(),
      getUpdatesEntitiesDataStreamName(namespace)
    );
    expect(deleteDataStream).toHaveBeenCalledWith(
      expect.anything(),
      getLegacySecurityUpdatesEntitiesDataStreamName(namespace)
    );
  });

  it('deletes the updates index template', async () => {
    await uninstallElasticsearchAssets({
      esClient: createEsClient() as unknown as ElasticsearchClient,
      logger: loggerMock.create(),
      namespace,
    });

    expect(deleteIndexTemplate).toHaveBeenCalledWith(
      expect.anything(),
      getLegacySecurityUpdatesIndexTemplateId(namespace)
    );
  });

  it('deletes the updates component templates for all entity types', async () => {
    await uninstallElasticsearchAssets({
      esClient: createEsClient() as unknown as ElasticsearchClient,
      logger: loggerMock.create(),
      namespace,
    });

    for (const type of ALL_ENTITY_TYPES) {
      expect(deleteComponentTemplate).toHaveBeenCalledWith(
        expect.anything(),
        getUpdatesComponentTemplateName(type, namespace)
      );
    }
  });

  it('deletes the metadata data stream so Clear Entity Data removes relationship history', async () => {
    await uninstallElasticsearchAssets({
      esClient: createEsClient() as unknown as ElasticsearchClient,
      logger: loggerMock.create(),
      namespace,
    });

    expect(deleteDataStream).toHaveBeenCalledWith(
      expect.anything(),
      getMetadataEntitiesDataStreamName(namespace)
    );
    expect(deleteDataStream).toHaveBeenCalledWith(
      expect.anything(),
      getLegacySecurityMetadataEntitiesDataStreamName(namespace)
    );
    // Verify the resolved name matches the entity metadata datastream that
    // relationship maintainers write to.
    expect(getMetadataEntitiesDataStreamName(namespace)).toBe('.entities.v2.metadata.default');
  });

  it('deletes all data-plane resources in a single uninstall call', async () => {
    await uninstallElasticsearchAssets({
      esClient: createEsClient() as unknown as ElasticsearchClient,
      logger: loggerMock.create(),
      namespace,
    });

    expect(deleteIndex).toHaveBeenCalledTimes(4);
    expect(deleteDataStream).toHaveBeenCalledTimes(4);
    expect(deleteIndexTemplate).toHaveBeenCalledTimes(2);
    expect(deleteComponentTemplate).toHaveBeenCalledTimes(ALL_ENTITY_TYPES.length);
  });
});
