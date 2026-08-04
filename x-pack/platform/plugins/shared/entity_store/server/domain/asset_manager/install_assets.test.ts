/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { uninstallElasticsearchAssets } from './install_assets';
import { getLatestEntitiesIndexName } from '../../../common/domain/entity_index';
import {
  getHistorySnapshotIndexName,
  getHistorySnapshotIndexPattern,
} from './history_snapshot_index';
import { getUpdatesEntitiesDataStreamName } from './updates_data_stream';
import { getMetadataEntitiesDataStreamName } from './metadata_data_stream';

jest.mock('../../infra/elasticsearch');

const { deleteIndex, deleteDataStream } = jest.requireMock('../../infra/elasticsearch') as {
  deleteIndex: jest.Mock;
  deleteDataStream: jest.Mock;
};

describe('uninstallElasticsearchAssets', () => {
  const namespace = 'default';
  const historyPattern = getHistorySnapshotIndexPattern(namespace);
  const historyIndexA = getHistorySnapshotIndexName(namespace, new Date('2026-07-29T10:00:00Z'));
  const historyIndexB = getHistorySnapshotIndexName(namespace, new Date('2026-07-29T11:00:00Z'));

  const createEsClient = (historyIndices: string[] = [historyIndexA, historyIndexB]) => ({
    indices: {
      resolveIndex: jest.fn().mockResolvedValue({
        indices: historyIndices.map((name) => ({ name })),
        aliases: [],
        data_streams: [],
      }),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    deleteIndex.mockResolvedValue(undefined);
    deleteDataStream.mockResolvedValue(undefined);
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
    // Must not pass the wildcard pattern to delete — ES rejects it when
    // action.destructive_requires_name=true.
    expect(deleteIndex).not.toHaveBeenCalledWith(expect.anything(), historyPattern);
    expect(deleteIndex).toHaveBeenCalledWith(expect.anything(), historyIndexA);
    expect(deleteIndex).toHaveBeenCalledWith(expect.anything(), historyIndexB);
  });

  it('skips history index delete when no history indices exist', async () => {
    await uninstallElasticsearchAssets({
      esClient: createEsClient([]) as unknown as ElasticsearchClient,
      logger: loggerMock.create(),
      namespace,
    });

    expect(deleteIndex).toHaveBeenCalledTimes(1);
    expect(deleteIndex).toHaveBeenCalledWith(
      expect.anything(),
      getLatestEntitiesIndexName(namespace)
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

    expect(deleteIndex).toHaveBeenCalledTimes(3);
    expect(deleteDataStream).toHaveBeenCalledTimes(2);
  });
});
