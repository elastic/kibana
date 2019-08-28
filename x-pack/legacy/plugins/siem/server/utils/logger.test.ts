/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createLogger } from './logger';

const APP_ID = 'siem';

const createMockHapiLogger = () => jest.fn();

describe('logger', () => {
  describe('#createLogger', () => {
    test('should log out debug', () => {
      const hapiLogger = createMockHapiLogger();
      const logger = createLogger(hapiLogger);
      logger.debug('debug information');
      expect(hapiLogger.mock.calls[0][0]).toEqual(['debug', APP_ID]);
      expect(hapiLogger.mock.calls[0][1]).toEqual('debug information');
    });

    test('should log out info', () => {
      const hapiLogger = createMockHapiLogger();
      const logger = createLogger(hapiLogger);
      logger.info('info information');
      expect(hapiLogger.mock.calls[0][0]).toEqual(['info', APP_ID]);
      expect(hapiLogger.mock.calls[0][1]).toEqual('info information');
    });

    test('should log out warn', () => {
      const hapiLogger = createMockHapiLogger();
      const logger = createLogger(hapiLogger);
      logger.warn('warn information');
      expect(hapiLogger.mock.calls[0][0]).toEqual(['warning', APP_ID]);
      expect(hapiLogger.mock.calls[0][1]).toEqual('warn information');
    });

    test('should log out error', () => {
      const hapiLogger = createMockHapiLogger();
      const logger = createLogger(hapiLogger);
      logger.error('error information');
      expect(hapiLogger.mock.calls[0][0]).toEqual(['error', APP_ID]);
      expect(hapiLogger.mock.calls[0][1]).toEqual('error information');
    });
  });
});
