/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import type { Logger } from '@kbn/core/server';
import { createMockSearchClient } from '../../test_utils';
import { createLoggerService } from '../logger_service/logger_service.mock';
import { QueryService } from './query_service';

export function createQueryService(): {
  queryService: QueryService;
  mockSearchClient: jest.Mocked<IScopedSearchClient>;
  mockLogger: jest.Mocked<Logger>;
} {
  const mockSearchClient = createMockSearchClient();
  const { loggerService, mockLogger } = createLoggerService();
  const queryService = new QueryService(mockSearchClient, loggerService);
  return { queryService, mockSearchClient, mockLogger };
}
