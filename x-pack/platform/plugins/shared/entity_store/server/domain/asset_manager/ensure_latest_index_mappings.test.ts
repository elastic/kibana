/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { getLatestEntitiesIndexName } from '../../../common/domain/entity_index';
import { ENTITY_CREATED_BY_FIELD } from '../../../common/domain/definitions/common_fields';
import {
  ensureLatestIndexProvenanceMapping,
  ensureLatestIndexProvenanceMappingOnce,
  prepareLatestIndexProvenanceMapping,
  resetEnsuredLatestIndexProvenanceNamespaces,
} from './ensure_latest_index_mappings';

const esError = (type: string, statusCode?: number) =>
  Object.assign(new Error(type), {
    statusCode,
    meta: { statusCode, body: { error: { type } } },
  });

describe('ensureLatestIndexProvenanceMapping', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    resetEnsuredLatestIndexProvenanceNamespaces();
  });

  it('installs current component and index templates before updating the mapping', async () => {
    await expect(ensureLatestIndexProvenanceMapping(esClient, 'default', logger)).resolves.toBe(
      true
    );

    expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: getLatestEntitiesIndexName('default'),
      properties: {
        [ENTITY_CREATED_BY_FIELD]: { type: 'keyword' },
      },
    });

    const lastComponentTemplateOrder =
      esClient.cluster.putComponentTemplate.mock.invocationCallOrder.at(-1);
    const indexTemplateOrder = esClient.indices.putIndexTemplate.mock.invocationCallOrder[0];
    const putMappingOrder = esClient.indices.putMapping.mock.invocationCallOrder[0];
    expect(lastComponentTemplateOrder).toBeLessThan(indexTemplateOrder);
    expect(indexTemplateOrder).toBeLessThan(putMappingOrder);
  });

  it('returns false when the latest index does not exist', async () => {
    esClient.indices.putMapping.mockRejectedValueOnce(esError('index_not_found_exception', 404));

    await expect(ensureLatestIndexProvenanceMapping(esClient, 'default', logger)).resolves.toBe(
      false
    );
  });

  it('rethrows unexpected errors', async () => {
    esClient.indices.putMapping.mockRejectedValueOnce(esError('cluster_block_exception', 403));

    await expect(ensureLatestIndexProvenanceMapping(esClient, 'default', logger)).rejects.toThrow(
      'cluster_block_exception'
    );
  });
});

describe('ensureLatestIndexProvenanceMappingOnce', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    resetEnsuredLatestIndexProvenanceNamespaces();
  });

  it('runs once per namespace after a successful update', async () => {
    await expect(ensureLatestIndexProvenanceMappingOnce(esClient, 'default', logger)).resolves.toBe(
      true
    );
    await expect(ensureLatestIndexProvenanceMappingOnce(esClient, 'default', logger)).resolves.toBe(
      true
    );

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
  });

  it('runs separately for each namespace', async () => {
    await ensureLatestIndexProvenanceMappingOnce(esClient, 'default', logger);
    await ensureLatestIndexProvenanceMappingOnce(esClient, 'space-1', logger);

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(2);
  });

  it('returns false and retries after a failure', async () => {
    esClient.indices.putMapping.mockRejectedValueOnce(esError('cluster_block_exception', 403));

    await expect(ensureLatestIndexProvenanceMappingOnce(esClient, 'default', logger)).resolves.toBe(
      false
    );
    await expect(ensureLatestIndexProvenanceMappingOnce(esClient, 'default', logger)).resolves.toBe(
      true
    );

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to sync'));
  });
});

describe('prepareLatestIndexProvenanceMapping', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    resetEnsuredLatestIndexProvenanceNamespaces();
  });

  it('does not touch mappings when the feature flag is off', async () => {
    const featureFlags = {
      getBooleanValue: jest.fn().mockResolvedValue(false),
    } as unknown as FeatureFlagsStart;

    await expect(
      prepareLatestIndexProvenanceMapping({
        esClient,
        featureFlags,
        namespace: 'default',
        logger,
      })
    ).resolves.toBe(false);

    expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
  });

  it('returns true only after the gated mapping update succeeds', async () => {
    const featureFlags = {
      getBooleanValue: jest.fn().mockResolvedValue(true),
    } as unknown as FeatureFlagsStart;

    await expect(
      prepareLatestIndexProvenanceMapping({
        esClient,
        featureFlags,
        namespace: 'default',
        logger,
      })
    ).resolves.toBe(true);

    expect(esClient.indices.putMapping).toHaveBeenCalledTimes(1);
  });

  it('keeps extraction provenance disabled when the mapping update fails', async () => {
    const featureFlags = {
      getBooleanValue: jest.fn().mockResolvedValue(true),
    } as unknown as FeatureFlagsStart;
    esClient.indices.putMapping.mockRejectedValueOnce(esError('cluster_block_exception', 403));

    await expect(
      prepareLatestIndexProvenanceMapping({
        esClient,
        featureFlags,
        namespace: 'default',
        logger,
      })
    ).resolves.toBe(false);
  });
});
