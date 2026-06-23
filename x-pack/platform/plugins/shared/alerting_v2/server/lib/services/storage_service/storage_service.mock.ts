/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createMockEsClient } from '../../test_utils';
import { createLoggerService } from '../logger_service/logger_service.mock';
import { StorageService, type StorageServiceContract } from './storage_service';

export function createStorageService(): {
  storageService: StorageService;
  mockEsClient: jest.Mocked<ElasticsearchClient>;
  mockLogger: jest.Mocked<Logger>;
} {
  const mockEsClient = createMockEsClient();
  const { loggerService, mockLogger } = createLoggerService();
  const storageService = new StorageService(mockEsClient, loggerService);
  return { storageService, mockEsClient, mockLogger };
}

/**
 * Returns a fully-stubbed {@link StorageServiceContract} for tests that only
 * care about *what* was sent to the contract (e.g. unit-testing a pipeline
 * step). For tests that need to exercise the real ES bulk serialization, use
 * {@link createStorageService} instead.
 */
export function createMockStorageServiceContract(): jest.Mocked<StorageServiceContract> {
  return {
    bulkIndexDocs: jest.fn().mockResolvedValue(undefined),
    bulkIndexAcrossIndices: jest.fn().mockResolvedValue(undefined),
  };
}
