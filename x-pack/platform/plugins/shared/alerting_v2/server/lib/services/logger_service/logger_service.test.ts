/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { createLoggerService } from './logger_service.mock';
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
    it('should call logger.debug with the message and no meta when no labels are given', () => {
      const message = 'Test debug message';

      loggerService.debug({ message });

      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(message);
    });

    it('should attach labels as meta', () => {
      const message = 'Test debug message';

      loggerService.debug({ message, labels: { rule_id: 'rule-1', step: 'fetch_rule' } });

      expect(mockLogger.debug).toHaveBeenCalledWith(message, {
        labels: { rule_id: 'rule-1', step: 'fetch_rule' },
      });
    });
  });

  describe('info', () => {
    it('should call logger.info with the message and no meta when no labels are given', () => {
      const message = 'Test info message';

      loggerService.info({ message });

      expect(mockLogger.info).toHaveBeenCalledWith(message);
    });

    it('should attach labels as meta', () => {
      const message = 'Test info message';

      loggerService.info({ message, labels: { task_id: 'task-1' } });

      expect(mockLogger.info).toHaveBeenCalledWith(message, { labels: { task_id: 'task-1' } });
    });
  });

  describe('warn', () => {
    it('should emit the code as a label', () => {
      const message = 'Test warn message';

      loggerService.warn({
        message,
        code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_NOT_FOUND,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(message, {
        labels: { code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_NOT_FOUND },
      });
    });

    it('should merge labels with the code', () => {
      loggerService.warn({
        message: 'Test warn message',
        code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_NOT_FOUND,
        labels: { workflow_id: 'workflow-1', group_id: 'group-1' },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('Test warn message', {
        labels: {
          workflow_id: 'workflow-1',
          group_id: 'group-1',
          code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_NOT_FOUND,
        },
      });
    });

    it('should attach the optional cause as an ECS error', () => {
      const error = new TypeError('Test cause');

      loggerService.warn({
        message: 'Test warn message',
        code: ALERTING_LOG_CODES.POLICY_MATCHER_KQL_INVALID,
        error,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('Test warn message', {
        labels: { code: ALERTING_LOG_CODES.POLICY_MATCHER_KQL_INVALID },
        error: {
          message: error.message,
          stack_trace: error.stack,
          type: 'TypeError',
        },
      });
    });

    it('should preserve a lazy message', () => {
      const message = () => 'Lazy warn message';

      loggerService.warn({ message, code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_DISABLED });

      expect(mockLogger.warn).toHaveBeenCalledWith(message, expect.anything());
    });
  });

  describe('error', () => {
    it('should default the message to the error message and emit the code as a label', () => {
      const error = new Error('Test error');

      loggerService.error({ error, code: ALERTING_LOG_CODES.RESOURCES_BOOTSTRAP_FAILED });

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(error.message, {
        labels: { code: ALERTING_LOG_CODES.RESOURCES_BOOTSTRAP_FAILED },
        error: {
          message: error.message,
          stack_trace: error.stack,
          type: 'Error',
        },
      });
    });

    it('should merge labels with the code', () => {
      const error = new Error('Test error');

      loggerService.error({
        error,
        code: ALERTING_LOG_CODES.RULE_EXECUTION_STEP_FAILED,
        labels: { step: 'fetch_rule', rule_id: 'rule-1' },
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({
          labels: {
            step: 'fetch_rule',
            rule_id: 'rule-1',
            code: ALERTING_LOG_CODES.RULE_EXECUTION_STEP_FAILED,
          },
        })
      );
    });

    it('should derive the ECS error type from the error constructor', () => {
      class QueryTimeoutError extends Error {}
      const error = new QueryTimeoutError('Test error');

      loggerService.error({ error, code: ALERTING_LOG_CODES.QUERY_ESQL_EXECUTION_FAILED });

      expect(mockLogger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({
          error: expect.objectContaining({ type: 'QueryTimeoutError' }),
        })
      );
    });

    it.each([
      ['a string', 'boom', 'boom'],
      ['a number', 42, '42'],
      ['an object', { reason: 'boom' }, '[object Object]'],
      [
        'a saved object error',
        { statusCode: 500, error: 'Internal Server Error', message: 'Decryption failed' },
        'Decryption failed',
      ],
    ])('should normalize %s thrown value', (_, thrown, expectedMessage) => {
      loggerService.error({
        error: thrown,
        code: ALERTING_LOG_CODES.STORAGE_BULK_INDEX_FAILED,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expectedMessage,
        expect.objectContaining({
          error: expect.objectContaining({ message: expectedMessage, type: 'Error' }),
        })
      );
    });

    it('should use the message override for both the record and the ECS error', () => {
      const error = new Error('Query [FROM users | WHERE email == "a@b.c"] failed to parse');

      loggerService.error({
        message: 'Rule query failed to parse or verify',
        error,
        code: ALERTING_LOG_CODES.QUERY_ESQL_EXECUTION_FAILED,
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Rule query failed to parse or verify', {
        labels: { code: ALERTING_LOG_CODES.QUERY_ESQL_EXECUTION_FAILED },
        error: {
          message: 'Rule query failed to parse or verify',
          stack_trace: error.stack,
          type: 'Error',
        },
      });
    });

    it('should resolve a lazy message override', () => {
      const error = new Error('Test error');

      loggerService.error({
        message: () => 'Lazy error message',
        error,
        code: ALERTING_LOG_CODES.QUERY_ESQL_EXECUTION_FAILED,
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Lazy error message', expect.anything());
    });
  });

  describe('forSubsystem', () => {
    it('should return a logger bound to the subsystem context', () => {
      const dispatcher = loggerService.forSubsystem('dispatcher');

      expect(mockLogger.get).toHaveBeenCalledWith('dispatcher');

      dispatcher.debug({ message: 'Test debug message' });

      expect(mockLogger.debug).toHaveBeenCalledWith('Test debug message');
    });

    it('should reuse the instance for the same subsystem', () => {
      expect(loggerService.forSubsystem('dispatcher')).toBe(
        loggerService.forSubsystem('dispatcher')
      );
      expect(loggerService.forSubsystem('dispatcher')).not.toBe(
        loggerService.forSubsystem('director')
      );
    });

    it('should support chaining from a child logger', () => {
      const child = loggerService.forSubsystem('ruleExecutor').forSubsystem('director');

      child.warn({
        message: 'Test warn message',
        code: ALERTING_LOG_CODES.RULE_EXECUTION_STEP_FAILED,
      });

      expect(mockLogger.get).toHaveBeenCalledWith('ruleExecutor');
      expect(mockLogger.get).toHaveBeenCalledWith('director');
    });

    it('should record child logger calls on the mock returned by createLoggerService', () => {
      const { loggerService: mockedService, mockLogger: mockedLogger } = createLoggerService();

      mockedService.forSubsystem('dispatcher').debug({ message: 'Test debug message' });

      expect(mockedLogger.debug).toHaveBeenCalledWith('Test debug message');
    });
  });

  describe('withLabels', () => {
    it('should attach bound labels on every log call', () => {
      const bound = loggerService.withLabels({ rule_id: 'rule-1', space_id: 'default' });

      bound.debug({ message: 'Test debug message' });

      expect(mockLogger.debug).toHaveBeenCalledWith('Test debug message', {
        labels: { rule_id: 'rule-1', space_id: 'default' },
      });
    });

    it('should merge per-call labels over bound labels', () => {
      const bound = loggerService.withLabels({ rule_id: 'rule-1', step: 'fetch_rule' });

      bound.debug({ message: 'Test debug message', labels: { step: 'validate_rule' } });

      expect(mockLogger.debug).toHaveBeenCalledWith('Test debug message', {
        labels: { rule_id: 'rule-1', step: 'validate_rule' },
      });
    });

    it('should merge bound labels with warn/error code', () => {
      const bound = loggerService.withLabels({ rule_id: 'rule-1' });

      bound.warn({
        message: 'Test warn message',
        code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_NOT_FOUND,
      });
      bound.error({
        error: new Error('boom'),
        code: ALERTING_LOG_CODES.RULE_EXECUTION_STEP_FAILED,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith('Test warn message', {
        labels: {
          rule_id: 'rule-1',
          code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_NOT_FOUND,
        },
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'boom',
        expect.objectContaining({
          labels: {
            rule_id: 'rule-1',
            code: ALERTING_LOG_CODES.RULE_EXECUTION_STEP_FAILED,
          },
        })
      );
    });

    it('should not mutate the parent logger', () => {
      const bound = loggerService.withLabels({ rule_id: 'rule-1' });

      bound.debug({ message: 'bound' });
      loggerService.debug({ message: 'unbound' });

      expect(mockLogger.debug).toHaveBeenNthCalledWith(1, 'bound', {
        labels: { rule_id: 'rule-1' },
      });
      expect(mockLogger.debug).toHaveBeenNthCalledWith(2, 'unbound');
    });

    it('should compose with forSubsystem', () => {
      const bound = loggerService.forSubsystem('ruleExecutor').withLabels({
        rule_id: 'rule-1',
        task_id: 'task-1',
      });

      bound.debug({ message: 'Test debug message', labels: { step: 'fetch_rule' } });

      expect(mockLogger.get).toHaveBeenCalledWith('ruleExecutor');
      expect(mockLogger.debug).toHaveBeenCalledWith('Test debug message', {
        labels: { rule_id: 'rule-1', task_id: 'task-1', step: 'fetch_rule' },
      });
    });

    it('should preserve bound labels when scoping a subsystem', () => {
      const bound = loggerService.withLabels({ rule_id: 'rule-1' }).forSubsystem('director');

      bound.debug({ message: 'Test debug message' });

      expect(mockLogger.get).toHaveBeenCalledWith('director');
      expect(mockLogger.debug).toHaveBeenCalledWith('Test debug message', {
        labels: { rule_id: 'rule-1' },
      });
    });
  });
});
