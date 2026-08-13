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
