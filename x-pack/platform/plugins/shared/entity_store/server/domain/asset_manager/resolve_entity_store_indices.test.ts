/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  resolveEntityStoreWriteTargets,
  resolveLatestEntitiesIndexName,
  resolveHistorySnapshotIndexPatterns,
} from './resolve_entity_store_indices';
import {
  getLatestEntitiesIndexName,
  getLegacySecurityLatestEntitiesIndexName,
} from '../../../common/domain/entity_index';
import { getUpdatesEntitiesDataStreamName } from './updates_data_stream';
import { getMetadataEntitiesDataStreamName } from './metadata_data_stream';

describe('resolveEntityStoreWriteTargets', () => {
  const namespace = 'default';
  const esClient = {
    indices: {
      get: jest.fn(),
      getDataStream: jest.fn(),
      getAlias: jest.fn(),
    },
  } as any;

  const notFoundError = () =>
    Object.assign(new Error('index_not_found_exception'), { meta: { statusCode: 404 } });

  const mockConcrete = (concreteNames: string[]) => {
    const concrete = new Set(concreteNames);
    esClient.indices.getDataStream.mockImplementation(async ({ name }: { name: string }) => {
      if (concrete.has(name) && (name.includes('metadata') || name.includes('updates'))) {
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
    esClient.indices.getAlias.mockRejectedValue({ meta: { statusCode: 404 } });
  });

  it('returns neutral names when no legacy assets exist', async () => {
    mockConcrete([]);

    await expect(resolveEntityStoreWriteTargets(esClient, namespace)).resolves.toEqual({
      latestIndex: getLatestEntitiesIndexName(namespace),
      updatesDataStream: getUpdatesEntitiesDataStreamName(namespace),
      metadataDataStream: getMetadataEntitiesDataStreamName(namespace),
    });
  });

  it('returns legacy names while the old concrete assets still exist', async () => {
    const legacyLatest = getLegacySecurityLatestEntitiesIndexName(namespace);
    mockConcrete([
      legacyLatest,
      `.entities.v2.updates.security_${namespace}`,
      `.entities.v2.metadata.security_${namespace}`,
    ]);

    await expect(resolveEntityStoreWriteTargets(esClient, namespace)).resolves.toEqual({
      latestIndex: legacyLatest,
      updatesDataStream: `.entities.v2.updates.security_${namespace}`,
      metadataDataStream: `.entities.v2.metadata.security_${namespace}`,
    });
  });

  it('returns mixed targets when only some legacy assets remain', async () => {
    mockConcrete([getLegacySecurityLatestEntitiesIndexName(namespace)]);

    await expect(resolveEntityStoreWriteTargets(esClient, namespace)).resolves.toEqual({
      latestIndex: getLegacySecurityLatestEntitiesIndexName(namespace),
      updatesDataStream: getUpdatesEntitiesDataStreamName(namespace),
      metadataDataStream: getMetadataEntitiesDataStreamName(namespace),
    });
  });

  it('returns neutral names when candidate names belong to space security_{namespace}', async () => {
    const collidingLatest = getLegacySecurityLatestEntitiesIndexName(namespace);
    mockConcrete([collidingLatest]);
    esClient.indices.getAlias.mockImplementation(async ({ name }: { name: string }) => {
      if (name === `entities-latest-security_${namespace}`) {
        return { [collidingLatest]: { aliases: { [name]: {} } } };
      }
      throw notFoundError();
    });

    await expect(resolveLatestEntitiesIndexName(esClient, namespace)).resolves.toBe(
      getLatestEntitiesIndexName(namespace)
    );
  });

  describe('resolveHistorySnapshotIndexPatterns', () => {
    it('returns neutral and legacy patterns so un-migrated snapshots stay readable', async () => {
      mockConcrete([]);

      await expect(resolveHistorySnapshotIndexPatterns(esClient, namespace)).resolves.toEqual([
        `.entities.v2.history.${namespace}.*`,
        `.entities.v2.history.security_${namespace}.*`,
      ]);
    });

    it('returns only the neutral pattern when space security_{namespace} owns the colliding names', async () => {
      mockConcrete([]);
      esClient.indices.getAlias.mockImplementation(async ({ name }: { name: string }) => {
        if (name === `entities-latest-security_${namespace}`) {
          return { some_index: { aliases: { [name]: {} } } };
        }
        throw notFoundError();
      });

      await expect(resolveHistorySnapshotIndexPatterns(esClient, namespace)).resolves.toEqual([
        `.entities.v2.history.${namespace}.*`,
      ]);
    });
  });
});
