/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { createMemoryStorage, memoryStorageSettings } from './memory_storage';

jest.mock('@kbn/storage-adapter', () => {
  const actual = jest.requireActual('@kbn/storage-adapter');
  return {
    ...actual,
    StorageIndexAdapter: jest.fn(),
  };
});

describe('memoryStorageSettings', () => {
  it('maps the root envelope and memory lifecycle fields', () => {
    const rootProperties = memoryStorageSettings.schema.properties;
    const memoryProperties = rootProperties.memory.properties;

    expect(Object.keys(memoryProperties)).toEqual(
      expect.arrayContaining([
        'valid_at',
        'invalid_at',
        'expired_at',
        'superseded_by',
        'suppress_until',
        'use_count',
        'last_used_at',
      ])
    );
    expect(Object.keys(rootProperties)).toEqual(
      expect.arrayContaining([
        'id',
        'type',
        'title',
        'description',
        'tags',
        'deleted',
        'expires_at',
        'search_embedding',
        '@timestamp',
        'created_at',
        'space_id',
      ])
    );

    const dateMapping = {
      format: 'strict_date_optional_time',
      type: 'date',
    };
    expect(rootProperties['@timestamp']).toEqual(dateMapping);
    expect(rootProperties.created_at).toEqual(dateMapping);
    expect(rootProperties.expires_at).toEqual(dateMapping);
    expect(memoryProperties.valid_at).toEqual(dateMapping);
    expect(memoryProperties.invalid_at).toEqual(dateMapping);
    expect(memoryProperties.expired_at).toEqual(dateMapping);
    expect(memoryProperties.suppress_until).toEqual(dateMapping);
    expect(memoryProperties.last_used_at).toEqual(dateMapping);
    expect(memoryProperties.use_count).toEqual({ type: 'long' });
    expect(memoryProperties.superseded_by).toEqual({
      ignore_above: 1024,
      type: 'keyword',
    });
    expect(memoryProperties.prior_document).toEqual({
      enabled: false,
      type: 'object',
    });
  });
});

describe('createMemoryStorage', () => {
  it('keeps data operations on the current user and template operations on the internal user', () => {
    const esClient = {} as ElasticsearchClient;
    const indexManagementClient = {} as ElasticsearchClient;
    const logger = loggerMock.create();

    createMemoryStorage({ logger, esClient, indexManagementClient });

    expect(StorageIndexAdapter).toHaveBeenCalledWith(esClient, logger, memoryStorageSettings, {
      indexManagementClient,
    });
  });
});
