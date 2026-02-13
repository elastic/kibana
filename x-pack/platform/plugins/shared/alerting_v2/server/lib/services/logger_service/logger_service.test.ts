/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { LoggerService } from './logger_service';

describe('LoggerService', () => {
  let mockLogger: jest.Mocked<Logger>;
  let loggerService: LoggerService;

  beforeEach(() => {
    mockLogger = loggerMock.create();
    loggerService = new LoggerService(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('debug', () => {
    it('should call logger.debug with the message', () => {
      const message = 'Test debug message';

      loggerService.debug({ message });

      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(message);
    });
  });

  describe('error', () => {
    it('should call logger.error with error message and EcsError when only error is provided', () => {
      const error = new Error('Test error');

      loggerService.error({ error });

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(error.message, {
        error: {
          code: 'UNKNOWN_ERROR',
          message: error.message,
          stack_trace: error.stack,
          type: 'Error',
        },
      });
    });

    it('should use the code and the type if provided', () => {
      const error = new Error('Test error');
      const code = 'CUSTOM_ERROR_CODE';
      const type = 'CustomErrorType';

      loggerService.error({ error, code, type });

      expect(mockLogger.error).toHaveBeenCalledWith(error.message, {
        error: {
          code,
          message: error.message,
          stack_trace: error.stack,
          type,
        },
      });
    });
  });
});
