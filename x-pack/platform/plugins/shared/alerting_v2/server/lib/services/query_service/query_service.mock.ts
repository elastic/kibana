/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { QueryStreamFormat } from '../../../config';
import { createMockEsClient } from '../../test_utils';
import { createLoggerService } from '../logger_service/logger_service.mock';
import { QueryService } from './query_service';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';

/**
 * Defaults `streamFormat` to `arrow` so existing streaming tests that drive the
 * Arrow reader mocks keep working. Pass `json` to exercise the JSON streaming
 * path (the production default configured via `xpack.alerting_v2.query`).
 */
export function createQueryService(streamFormat: QueryStreamFormat = 'arrow'): {
  queryService: QueryService;
  mockEsClient: DeeplyMockedApi<ElasticsearchClient>;
  mockLogger: jest.Mocked<Logger>;
} {
  const mockEsClient = createMockEsClient();
  const { loggerService, mockLogger } = createLoggerService();
  const queryService = new QueryService(mockEsClient, loggerService, streamFormat);
  return { queryService, mockEsClient, mockLogger };
}
