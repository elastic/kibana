/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventLoggerMock, eventLogServiceMock } from '@kbn/event-log-plugin/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { EventLogService } from './event_log_service';

export function createEventLogService(): {
  eventLogService: EventLogService;
  mockEventLogger: ReturnType<typeof eventLoggerMock.create>;
  mockEventLogSetup: ReturnType<typeof eventLogServiceMock.create>;
  mockEsClient: DeeplyMockedApi<ElasticsearchClient>;
} {
  const mockEventLogger = eventLoggerMock.create();
  const mockEventLogSetup = eventLogServiceMock.create();
  const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();

  const eventLogService = new EventLogService(mockEventLogger, mockEventLogSetup, mockEsClient);

  return {
    eventLogService,
    mockEventLogger,
    mockEventLogSetup,
    mockEsClient,
  };
}
