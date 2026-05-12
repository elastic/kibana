/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventLoggerMock } from '@kbn/event-log-plugin/server/mocks';
import { EventLogService } from './event_log_service';

export function createEventLogService(): {
  eventLogService: EventLogService;
  mockEventLogger: ReturnType<typeof eventLoggerMock.create>;
} {
  const mockEventLogger = eventLoggerMock.create();
  const eventLogService = new EventLogService(mockEventLogger);
  return { eventLogService, mockEventLogger };
}
