/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { createMockEsClient } from '../../test_utils';
import { createLoggerService } from '../logger_service/logger_service.mock';
import { QueryService } from './query_service';
import type { EsqlConfig, PluginConfig } from '../../../config';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';

export function createQueryService(responseFormat: EsqlConfig['responseFormat'] = 'json'): {
  queryService: QueryService;
  mockEsClient: DeeplyMockedApi<ElasticsearchClient>;
  mockLogger: jest.Mocked<Logger>;
} {
  const mockEsClient = createMockEsClient();
  const { loggerService, mockLogger } = createLoggerService();
  const config: PluginConfig = {
    enabled: true,
    invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' },
    rules: {
      minimumScheduleInterval: '1m',
      maxScheduledPerMinute: 400,
      run: {
        alerts: { max: 10000 },
        maxGroupsPerExecution: 10000,
        query: { maxResponseSize: 50 * 1024 * 1024 },
      },
    },
    esql: { responseFormat },
  };
  const pluginConfigAccessor = coreMock.createPluginInitializerContext<PluginConfig>(config).config;
  const queryService = new QueryService(mockEsClient, loggerService, pluginConfigAccessor);
  return { queryService, mockEsClient, mockLogger };
}
