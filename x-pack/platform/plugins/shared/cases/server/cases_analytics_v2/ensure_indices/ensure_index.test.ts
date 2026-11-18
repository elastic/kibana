/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ensureIndex } from './ensure_index';

const INDEX = '.test-index';
const MAPPINGS: MappingTypeMapping = {
  dynamic: 'strict',
  dynamic_templates: [{ test: { match: 'test.*', mapping: { type: 'keyword' } } }],
  properties: { id: { type: 'keyword' } },
};

const buildDeps = () => ({
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  logger: loggerMock.create(),
});

describe('ensureIndex', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates the index with default settings and the given mapping when it does not exist', async () => {
    const { esClient, logger } = buildDeps();
    (esClient.indices.exists as unknown as jest.Mock).mockResolvedValue(false);
    (esClient.indices.create as unknown as jest.Mock).mockResolvedValue({});

    await ensureIndex({ esClient, logger, index: INDEX, mappings: MAPPINGS });

    expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    const call = (esClient.indices.create as unknown as jest.Mock).mock.calls[0][0];
    expect(call.index).toBe(INDEX);
    expect(call.mappings).toBe(MAPPINGS);
    expect(call.settings).toEqual({
      'index.hidden': true,
      'index.auto_expand_replicas': '0-1',
    });
    expect(logger.info).toHaveBeenCalledWith(`bootstrapped ${INDEX}`);
  });

  it('merges extra settings over the defaults', async () => {
    const { esClient, logger } = buildDeps();
    (esClient.indices.exists as unknown as jest.Mock).mockResolvedValue(false);
    (esClient.indices.create as unknown as jest.Mock).mockResolvedValue({});

    await ensureIndex({
      esClient,
      logger,
      index: INDEX,
      mappings: MAPPINGS,
      settings: { 'index.mode': 'lookup' },
    });

    const call = (esClient.indices.create as unknown as jest.Mock).mock.calls[0][0];
    expect(call.settings).toEqual({
      'index.hidden': true,
      'index.auto_expand_replicas': '0-1',
      'index.mode': 'lookup',
    });
  });

  it('applies an additive mapping sync (no create) when the index already exists', async () => {
    const { esClient, logger } = buildDeps();
    (esClient.indices.exists as unknown as jest.Mock).mockResolvedValue(true);
    (esClient.indices.putMapping as unknown as jest.Mock).mockResolvedValue({});

    await ensureIndex({ esClient, logger, index: INDEX, mappings: MAPPINGS });

    expect(esClient.indices.create).not.toHaveBeenCalled();
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: INDEX,
      properties: MAPPINGS.properties,
      dynamic_templates: MAPPINGS.dynamic_templates,
    });
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('applied additive mapping sync')
    );
  });

  it('throws when the additive mapping sync fails', async () => {
    const { esClient, logger } = buildDeps();
    (esClient.indices.exists as unknown as jest.Mock).mockResolvedValue(true);
    (esClient.indices.putMapping as unknown as jest.Mock).mockRejectedValue(
      new Error('illegal_argument_exception')
    );

    await expect(
      ensureIndex({ esClient, logger, index: INDEX, mappings: MAPPINGS })
    ).rejects.toThrow('illegal_argument_exception');
    expect(esClient.indices.create).not.toHaveBeenCalled();
  });

  it('swallows resource_already_exists_exception from a concurrent bootstrap race', async () => {
    const { esClient, logger } = buildDeps();
    (esClient.indices.exists as unknown as jest.Mock).mockResolvedValue(false);
    const err = Object.assign(new Error('already exists'), {
      meta: { body: { error: { type: 'resource_already_exists_exception' } } },
    });
    (esClient.indices.create as unknown as jest.Mock).mockRejectedValue(err);

    await expect(
      ensureIndex({ esClient, logger, index: INDEX, mappings: MAPPINGS })
    ).resolves.toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('throws an actionable message when the cluster shard limit is reached', async () => {
    const { esClient, logger } = buildDeps();
    (esClient.indices.exists as unknown as jest.Mock).mockResolvedValue(false);
    const err = Object.assign(new Error('Validation Failed: 1: this action would add [2] shards'), {
      meta: {
        body: {
          error: {
            type: 'validation_exception',
            reason:
              'Validation Failed: 1: this action would add [2] shards, but this cluster currently has [1000]/[1000] maximum normal shards open',
          },
        },
      },
    });
    (esClient.indices.create as unknown as jest.Mock).mockRejectedValue(err);

    await expect(
      ensureIndex({ esClient, logger, index: INDEX, mappings: MAPPINGS })
    ).rejects.toThrow('cluster.max_shards_per_node');
  });

  it('throws on unexpected ES failure so the caller can handle it', async () => {
    const { esClient, logger } = buildDeps();
    (esClient.indices.exists as unknown as jest.Mock).mockResolvedValue(false);
    const err = new Error('cluster_block_exception');
    (esClient.indices.create as unknown as jest.Mock).mockRejectedValue(err);

    await expect(
      ensureIndex({ esClient, logger, index: INDEX, mappings: MAPPINGS })
    ).rejects.toThrow('cluster_block_exception');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
