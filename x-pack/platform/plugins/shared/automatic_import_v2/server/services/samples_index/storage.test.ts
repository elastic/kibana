/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  ensureSamplesIndexHidden,
  createIndexAdapter,
  automaticImportSamplesIndexName,
} from './storage';

function createNotFoundError(): errors.ResponseError {
  return new errors.ResponseError({
    statusCode: 404,
    body: {},
    warnings: [],
    meta: {} as never,
  });
}

interface MockIndices {
  getIndexTemplate: jest.Mock;
  putIndexTemplate: jest.Mock;
  getAlias: jest.Mock;
  putSettings: jest.Mock;
}

function createMockEsClient(): ElasticsearchClient & { indices: MockIndices } {
  return {
    indices: {
      getIndexTemplate: jest.fn(),
      putIndexTemplate: jest.fn().mockResolvedValue({ acknowledged: true }),
      getAlias: jest.fn(),
      putSettings: jest.fn().mockResolvedValue({ acknowledged: true }),
    },
  } as ElasticsearchClient & { indices: MockIndices };
}

describe('ensureSamplesIndexHidden', () => {
  it('calls putIndexTemplate with merged settings and putSettings on write index when template and alias exist', async () => {
    const esClient = createMockEsClient();
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        {
          name: automaticImportSamplesIndexName,
          index_template: {
            index_patterns: [`${automaticImportSamplesIndexName}-*`],
            template: {
              mappings: { properties: {} },
              aliases: { [automaticImportSamplesIndexName]: { is_write_index: true } },
              settings: { 'index.number_of_shards': 1 },
            },
            _meta: { version: '1' },
          },
        },
      ],
    });
    esClient.indices.getAlias.mockResolvedValue({
      'automatic-import-samples-000001': {
        aliases: {
          [automaticImportSamplesIndexName]: { is_write_index: true },
        },
      },
    });

    await ensureSamplesIndexHidden(esClient);

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: automaticImportSamplesIndexName,
        create: false,
        allow_auto_create: false,
        index_patterns: [`${automaticImportSamplesIndexName}-*`],
        template: expect.objectContaining({
          settings: expect.objectContaining({
            'index.hidden': true,
            'index.number_of_shards': 1,
          }),
        }),
      })
    );
    expect(esClient.indices.putSettings).toHaveBeenCalledTimes(1);
    expect(esClient.indices.putSettings).toHaveBeenCalledWith({
      index: 'automatic-import-samples-000001',
      body: { 'index.hidden': true },
    });
  });

  it('does not throw when getIndexTemplate returns 404', async () => {
    const esClient = createMockEsClient();
    esClient.indices.getIndexTemplate.mockRejectedValue(createNotFoundError());

    await expect(ensureSamplesIndexHidden(esClient)).resolves.toBeUndefined();
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('does not throw when getAlias returns 404', async () => {
    const esClient = createMockEsClient();
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        {
          name: automaticImportSamplesIndexName,
          index_template: {
            index_patterns: [`${automaticImportSamplesIndexName}-*`],
            template: {
              mappings: { properties: {} },
              settings: {},
            },
          },
        },
      ],
    });
    esClient.indices.getAlias.mockRejectedValue(createNotFoundError());

    await expect(ensureSamplesIndexHidden(esClient)).resolves.toBeUndefined();
    expect(esClient.indices.putIndexTemplate).toHaveBeenCalled();
    expect(esClient.indices.putSettings).not.toHaveBeenCalled();
  });

  it('does not call putIndexTemplate when template has no template body', async () => {
    const esClient = createMockEsClient();
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        {
          name: automaticImportSamplesIndexName,
          index_template: {
            index_patterns: [`${automaticImportSamplesIndexName}-*`],
            template: undefined,
          },
        },
      ],
    });
    esClient.indices.getAlias.mockResolvedValue({});

    await ensureSamplesIndexHidden(esClient);

    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('does not call putSettings when no write index exists', async () => {
    const esClient = createMockEsClient();
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        {
          name: automaticImportSamplesIndexName,
          index_template: {
            index_patterns: [`${automaticImportSamplesIndexName}-*`],
            template: { mappings: { properties: {} }, settings: {} },
          },
        },
      ],
    });
    esClient.indices.getAlias.mockResolvedValue({});

    await ensureSamplesIndexHidden(esClient);

    expect(esClient.indices.putSettings).not.toHaveBeenCalled();
  });
});

describe('createIndexAdapter', () => {
  it('returns an adapter with getClient that exposes bulk, index, search, get, delete, clean, existsIndex', () => {
    const esClient = createMockEsClient();
    const logger = loggerMock.create();
    const adapter = createIndexAdapter({ logger, esClient });
    const client = adapter.getClient();

    expect(client.bulk).toBeDefined();
    expect(client.index).toBeDefined();
    expect(client.search).toBeDefined();
    expect(client.get).toBeDefined();
    expect(client.delete).toBeDefined();
    expect(client.clean).toBeDefined();
    expect(client.existsIndex).toBeDefined();
  });
});
