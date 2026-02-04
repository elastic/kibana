/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createMockEsClient } from '../../test_utils';
import { createLoggerService } from '../logger_service/logger_service.mock';
import { QueryService } from './query_service';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';

export function createQueryService(): {
  queryService: QueryService;
  mockEsClient: DeeplyMockedApi<ElasticsearchClient>;
  mockLogger: jest.Mocked<Logger>;
} {
  const mockEsClient = createMockEsClient();
  const { loggerService, mockLogger } = createLoggerService();
  const queryService = new QueryService(mockEsClient, loggerService);
  return { queryService, mockEsClient, mockLogger };
}
