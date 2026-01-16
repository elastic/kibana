/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StorageServiceContract } from './storage_service';

export function createMockStorageService() {
  type StorageServiceMock = jest.Mocked<StorageServiceContract>;
  const storageService = {
    bulkIndexDocs: jest.fn() as jest.MockedFunction<StorageServiceContract['bulkIndexDocs']>,
  } satisfies StorageServiceMock;

  return storageService;
}
