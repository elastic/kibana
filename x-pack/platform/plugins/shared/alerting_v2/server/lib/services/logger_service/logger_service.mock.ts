/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoggerServiceContract } from './logger_service';

export function createMockLoggerService() {
  type LoggerServiceMock = jest.Mocked<LoggerServiceContract>;
  const loggerService = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } satisfies LoggerServiceMock;

  return { loggerService };
}
