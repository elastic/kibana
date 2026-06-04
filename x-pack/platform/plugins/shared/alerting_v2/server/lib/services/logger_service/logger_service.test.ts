/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { LogMeta } from '@kbn/logging';
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
      expect(mockLogger.debug).toHaveBeenCalledWith(message, undefined);
    });

    it('should forward structured meta to logger.debug when provided', () => {
      interface DebugMeta extends LogMeta {
        kibana: { alerting_v2: { dispatcher: { tick_id: string } } };
      }
      const meta: DebugMeta = { kibana: { alerting_v2: { dispatcher: { tick_id: 't1' } } } };

      loggerService.debug<DebugMeta>({ message: 'with meta', meta });

      expect(mockLogger.debug).toHaveBeenCalledWith('with meta', meta);
    });
  });

  describe('info', () => {
    it('should call logger.info with only a message', () => {
      loggerService.info({ message: 'hello' });
      expect(mockLogger.info).toHaveBeenCalledWith('hello', undefined);
    });

    it('should forward structured meta to logger.info when provided', () => {
      interface InfoMeta extends LogMeta {
        kibana: {
          alerting_v2: {
            dispatcher: {
              tick: { duration_ms: number; completed: boolean; stages: unknown[] };
            };
          };
        };
      }
      const meta: InfoMeta = {
        kibana: {
          alerting_v2: {
            dispatcher: {
              tick: { duration_ms: 42, completed: true, stages: [] },
            },
          },
        },
      };

      loggerService.info<InfoMeta>({ message: 'dispatcher tick complete', meta });

      expect(mockLogger.info).toHaveBeenCalledWith('dispatcher tick complete', meta);
    });
  });

  describe('warn', () => {
    it('should call logger.warn with only a message', () => {
      loggerService.warn({ message: 'warn msg' });
      expect(mockLogger.warn).toHaveBeenCalledWith('warn msg', undefined);
    });

    it('should forward structured meta to logger.warn when provided', () => {
      interface WarnMeta extends LogMeta {
        kibana: { alerting_v2: { something: string } };
      }
      const meta: WarnMeta = { kibana: { alerting_v2: { something: 'off' } } };

      loggerService.warn<WarnMeta>({ message: 'with meta', meta });

      expect(mockLogger.warn).toHaveBeenCalledWith('with meta', meta);
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
