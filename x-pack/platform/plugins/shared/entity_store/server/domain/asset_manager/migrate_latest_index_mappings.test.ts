/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  LATEST_INDEX_MAPPINGS_VERSION,
  LATEST_INDEX_MAPPINGS_VERSION_META_KEY,
  getLatestEntitiesIndexName,
  getLegacySecurityLatestEntitiesIndexName,
} from '../../../common/domain/entity_index';
import { getLatestIndexMappingProperties } from './latest_index_mappings';
import { migrateLatestIndexMappings } from './migrate_latest_index_mappings';
import { resolveEntityStoreWriteTargets } from './resolve_entity_store_indices';

jest.mock('./resolve_entity_store_indices');

const mockResolveEntityStoreWriteTargets = resolveEntityStoreWriteTargets as jest.MockedFunction<
  typeof resolveEntityStoreWriteTargets
>;

const namespace = 'default';

const createEsClientMock = () => ({
  indices: {
    getMapping: jest.fn(),
    putMapping: jest.fn().mockResolvedValue({ acknowledged: true }),
    putIndexTemplate: jest.fn().mockResolvedValue({ acknowledged: true }),
  },
  cluster: {
    putComponentTemplate: jest.fn().mockResolvedValue({ acknowledged: true }),
  },
});

type EsClientMock = ReturnType<typeof createEsClientMock>;

const asEsClient = (esClient: EsClientMock): ElasticsearchClient =>
  esClient as unknown as ElasticsearchClient;

const notFoundError = () =>
  new esErrors.ResponseError({
    body: { error: { type: 'index_not_found_exception' } },
    statusCode: 404,
    headers: {},
    warnings: [],
    meta: {},
  } as unknown as ConstructorParameters<typeof esErrors.ResponseError>[0]);

type LiveProperties = Record<string, unknown>;

/** Turns flat dotted mapping keys into the nested `properties` shape `indices.getMapping` returns. */
const nestProperties = (flat: Record<string, unknown>): LiveProperties => {
  const root: LiveProperties = {};
  for (const [path, mapping] of Object.entries(flat)) {
    const segments = path.split('.');
    const leaf = segments.pop() as string;
    const parent = segments.reduce<LiveProperties>((node, segment) => {
      const existing = (node[segment] ?? { properties: {} }) as { properties: LiveProperties };
      node[segment] = existing;
      return existing.properties;
    }, root);
    parent[leaf] = mapping;
  }
  return root;
};

const mockLatestIndexMapping = (
  esClient: EsClientMock,
  index: string,
  meta: Record<string, unknown> | undefined,
  properties: LiveProperties = {}
) => {
  esClient.indices.getMapping.mockResolvedValue({
    [index]: { mappings: { ...(meta ? { _meta: meta } : {}), properties } },
  });
};

const withoutKeys = <T extends Record<string, unknown>>(record: T, keys: string[]) =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));

const expectNoWrites = (esClient: EsClientMock) => {
  expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
  expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  expect(esClient.indices.putMapping).not.toHaveBeenCalled();
};

describe('migrateLatestIndexMappings', () => {
  const latestIndex = getLatestEntitiesIndexName(namespace);
  let esClient: EsClientMock;
  let logger: ReturnType<typeof loggerMock.create>;

  const run = (ns: string = namespace) =>
    migrateLatestIndexMappings({ esClient: asEsClient(esClient), logger, namespace: ns });

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = createEsClientMock();
    logger = loggerMock.create();
    mockResolveEntityStoreWriteTargets.mockResolvedValue({
      latestIndex,
      updatesDataStream: 'updates',
      metadataDataStream: 'metadata',
    });
  });

  describe('existing install (mappingsVersion only)', () => {
    it('migrates with exactly the missing properties and merged _meta, and never sends settings', async () => {
      // A live index with only a couple of the definition fields: every other field is missing
      mockLatestIndexMapping(
        esClient,
        latestIndex,
        { mappingsVersion: 1 },
        nestProperties({ '@timestamp': { type: 'date' }, 'entity.id': { type: 'keyword' } })
      );

      await expect(run()).resolves.toBe('migrated');

      expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
      const [request] = esClient.indices.putMapping.mock.calls[0];
      expect(request).toEqual({
        index: latestIndex,
        properties: withoutKeys(getLatestIndexMappingProperties(namespace), [
          '@timestamp',
          'entity.id',
        ]),
        _meta: {
          mappingsVersion: 1,
          [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
        },
      });
      expect(Object.keys(request).sort()).toEqual(['_meta', 'index', 'properties']);
    });

    it('preserves every existing _meta key', async () => {
      mockLatestIndexMapping(esClient, latestIndex, {
        mappingsVersion: 1,
        somethingElse: { nested: true },
      });

      await run();

      expect(esClient.indices.putMapping.mock.calls[0][0]._meta).toEqual({
        mappingsVersion: 1,
        somethingElse: { nested: true },
        [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
      });
    });
  });

  it('migrates when the index has no _meta at all', async () => {
    mockLatestIndexMapping(esClient, latestIndex, undefined);

    await expect(run()).resolves.toBe('migrated');

    expect(esClient.indices.putMapping.mock.calls[0][0]._meta).toEqual({
      [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
    });
  });

  it('takes the entry of the concrete index when the response key differs from the requested name', async () => {
    mockLatestIndexMapping(esClient, `${latestIndex}-concrete`, { mappingsVersion: 1 });

    await expect(run()).resolves.toBe('migrated');

    expect(esClient.indices.putMapping.mock.calls[0][0].index).toBe(latestIndex);
  });

  describe('version comparison', () => {
    it('migrates when the stored version is lower than the current one', async () => {
      mockLatestIndexMapping(esClient, latestIndex, {
        mappingsVersion: 1,
        [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION - 1,
      });

      await expect(run()).resolves.toBe('migrated');

      expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
    });

    it('is up to date, with no ES write at all, when the stored version equals the current one', async () => {
      mockLatestIndexMapping(esClient, latestIndex, {
        mappingsVersion: 1,
        [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
      });

      await expect(run()).resolves.toBe('up_to_date');

      expectNoWrites(esClient);
    });

    it('never downgrades: a stored version higher than the current one is up to date', async () => {
      mockLatestIndexMapping(esClient, latestIndex, {
        mappingsVersion: 1,
        [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION + 1,
      });

      await expect(run()).resolves.toBe('up_to_date');

      expectNoWrites(esClient);
    });
  });

  describe('only the missing properties are sent', () => {
    const desired = getLatestIndexMappingProperties(namespace);

    it('sends only user.entity.id when the live index has every other definition field', async () => {
      mockLatestIndexMapping(
        esClient,
        latestIndex,
        { mappingsVersion: 1 },
        nestProperties(withoutKeys(desired, ['user.entity.id']))
      );

      await expect(run()).resolves.toBe('migrated');

      const [request] = esClient.indices.putMapping.mock.calls[0];
      expect(request.properties).toEqual({ 'user.entity.id': { type: 'keyword' } });
      expect(Object.keys(request).sort()).toEqual(['_meta', 'index', 'properties']);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('recognizes a field in a nested live mapping as present', async () => {
      const userFields = Object.keys(desired).filter((key) => key.startsWith('user.'));
      mockLatestIndexMapping(
        esClient,
        latestIndex,
        { mappingsVersion: 1 },
        {
          ...nestProperties(withoutKeys(desired, userFields)),
          user: { properties: { entity: { properties: { id: { type: 'keyword' } } } } },
        }
      );

      await run();

      const [request] = esClient.indices.putMapping.mock.calls[0];
      expect(Object.keys(request.properties ?? {}).sort()).toEqual(
        userFields.filter((key) => key !== 'user.entity.id').sort()
      );
    });

    it.each([
      ['an empty object with an explicit type', { properties: { entity: { type: 'object' } } }],
      ['an empty object with empty properties', { properties: { entity: { properties: {} } } }],
      ['a parent object without children', { properties: {} }],
      ['an explicit object without a properties key', { type: 'object' }],
    ])(
      'sends user.entity.id when the live mapping has %s where it would go',
      async (_description, liveUser) => {
        const userFields = Object.keys(desired).filter((key) => key.startsWith('user.'));
        mockLatestIndexMapping(
          esClient,
          latestIndex,
          { mappingsVersion: 1 },
          { ...nestProperties(withoutKeys(desired, userFields)), user: liveUser }
        );

        await expect(run()).resolves.toBe('migrated');

        const [request] = esClient.indices.putMapping.mock.calls[0];
        expect(Object.keys(request.properties ?? {}).sort()).toEqual([...userFields].sort());
        expect(request.properties).toHaveProperty(['user.entity.id'], { type: 'keyword' });
        expect(logger.warn).not.toHaveBeenCalled();
      }
    );

    it('sends every definition field when the live mapping has no properties at all', async () => {
      esClient.indices.getMapping.mockResolvedValue({
        [latestIndex]: { mappings: { _meta: { mappingsVersion: 1 } } },
      });

      await expect(run()).resolves.toBe('migrated');

      const [request] = esClient.indices.putMapping.mock.calls[0];
      expect(Object.keys(request.properties ?? {}).sort()).toEqual(Object.keys(desired).sort());
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('does not send a field whose live mapping has a different type, warns once, and still writes the version', async () => {
      mockLatestIndexMapping(
        esClient,
        latestIndex,
        { mappingsVersion: 1 },
        nestProperties({
          ...withoutKeys(desired, ['user.entity.id', 'user.name']),
          'user.name': { type: 'text' },
        })
      );

      await expect(run()).resolves.toBe('migrated');

      expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
      const [request] = esClient.indices.putMapping.mock.calls[0];
      expect(request.properties).toEqual({ 'user.entity.id': { type: 'keyword' } });
      expect(request._meta).toEqual({
        mappingsVersion: 1,
        [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
      });
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'field user.name is mapped as text but the definition expects keyword; it needs a reindex'
        )
      );
    });

    it('does not send a field whose parent is a leaf field in the live mapping, and warns', async () => {
      const userFields = Object.keys(desired).filter((key) => key.startsWith('user.'));
      mockLatestIndexMapping(
        esClient,
        latestIndex,
        { mappingsVersion: 1 },
        { ...nestProperties(withoutKeys(desired, userFields)), user: { type: 'keyword' } }
      );

      await expect(run()).resolves.toBe('migrated');

      const [request] = esClient.indices.putMapping.mock.calls[0];
      expect(
        Object.keys(request.properties ?? {}).filter((key) => key.startsWith('user.'))
      ).toEqual([]);
      expect(request._meta).toEqual({
        mappingsVersion: 1,
        [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
      });
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'field user.entity.id cannot be added because its parent user is mapped as keyword; it needs a reindex'
        )
      );
    });

    it('sends _meta only, with no properties key, when nothing is missing', async () => {
      mockLatestIndexMapping(
        esClient,
        latestIndex,
        { mappingsVersion: 1 },
        nestProperties(desired)
      );

      await expect(run()).resolves.toBe('migrated');

      expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
      const [request] = esClient.indices.putMapping.mock.calls[0];
      expect(Object.keys(request).sort()).toEqual(['_meta', 'index']);
      expect(request).toEqual({
        index: latestIndex,
        _meta: {
          mappingsVersion: 1,
          [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
        },
      });
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('treats a non-numeric stored version as 0 and migrates', async () => {
      mockLatestIndexMapping(esClient, latestIndex, {
        mappingsVersion: 1,
        [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: '1',
      });

      await expect(run()).resolves.toBe('migrated');

      expect(esClient.indices.putMapping.mock.calls[0][0]._meta).toEqual({
        mappingsVersion: 1,
        [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
      });
    });
  });

  describe('missing index', () => {
    it('returns index_missing on a 404 from getMapping and writes nothing', async () => {
      esClient.indices.getMapping.mockRejectedValue(notFoundError());

      await expect(run()).resolves.toBe('index_missing');

      expectNoWrites(esClient);
    });

    it('rethrows other getMapping errors', async () => {
      const error = new Error('cluster unavailable');
      esClient.indices.getMapping.mockRejectedValue(error);

      await expect(run()).rejects.toBe(error);

      expectNoWrites(esClient);
    });
  });

  describe('failures', () => {
    it('rejects with the namespace in the message and the cause when putMapping fails', async () => {
      const cause = new Error('mapper_parsing_exception');
      mockLatestIndexMapping(esClient, latestIndex, { mappingsVersion: 1 });
      esClient.indices.putMapping.mockRejectedValue(cause);

      const error = await run('space-a').catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('space-a');
      expect((error as Error).cause).toBe(cause);
      // _meta travels in the same request, so there is no separate write that could mark it migrated
      expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
    });

    it('rejects with the namespace in the message when a template refresh fails, before putMapping', async () => {
      const cause = new Error('template rejected');
      mockLatestIndexMapping(esClient, latestIndex, { mappingsVersion: 1 });
      esClient.cluster.putComponentTemplate.mockRejectedValue(cause);

      const error = await run('space-a').catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('space-a');
      expect((error as Error).cause).toBe(cause);
      expect(esClient.indices.putMapping).not.toHaveBeenCalled();
    });
  });

  describe('resolved latest index', () => {
    it('targets the legacy security-scoped latest index when that is what resolveEntityStoreWriteTargets returns', async () => {
      const legacyIndex = getLegacySecurityLatestEntitiesIndexName(namespace);
      mockResolveEntityStoreWriteTargets.mockResolvedValue({
        latestIndex: legacyIndex,
        updatesDataStream: 'updates',
        metadataDataStream: 'metadata',
      });
      mockLatestIndexMapping(esClient, legacyIndex, { mappingsVersion: 1 });

      await expect(run()).resolves.toBe('migrated');

      expect(mockResolveEntityStoreWriteTargets).toHaveBeenCalledWith(
        asEsClient(esClient),
        namespace
      );
      expect(esClient.indices.getMapping).toHaveBeenCalledWith({ index: legacyIndex });
      expect(esClient.indices.putMapping.mock.calls[0][0].index).toBe(legacyIndex);
    });
  });

  describe('template refresh', () => {
    it('refreshes component templates, then index templates, then putMapping on the migrate path', async () => {
      mockLatestIndexMapping(esClient, latestIndex, { mappingsVersion: 1 });

      await run();

      const componentOrders = esClient.cluster.putComponentTemplate.mock.invocationCallOrder;
      const indexTemplateOrders = esClient.indices.putIndexTemplate.mock.invocationCallOrder;
      const [putMappingOrder] = esClient.indices.putMapping.mock.invocationCallOrder;

      expect(componentOrders.length).toBeGreaterThan(0);
      expect(indexTemplateOrders.length).toBeGreaterThan(0);
      expect(Math.max(...componentOrders)).toBeLessThan(Math.min(...indexTemplateOrders));
      expect(Math.max(...indexTemplateOrders)).toBeLessThan(putMappingOrder);
    });

    it('does not touch templates on the up-to-date path', async () => {
      mockLatestIndexMapping(esClient, latestIndex, {
        [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
      });

      await run();

      expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
      expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    });
  });
});
