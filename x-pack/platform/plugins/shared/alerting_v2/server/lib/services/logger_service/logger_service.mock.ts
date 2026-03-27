/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { LoggerService } from './logger_service';

export function createLoggerService(): {
  loggerService: LoggerService;
  mockLogger: jest.Mocked<Logger>;
} {
  const mockLogger = loggerMock.create();
  const loggerService = new LoggerService(mockLogger);
  return { loggerService, mockLogger };
}
