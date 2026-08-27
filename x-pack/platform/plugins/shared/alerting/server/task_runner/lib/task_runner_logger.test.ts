/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { LogRecord } from '@kbn/logging';
import { LogLevel } from '@kbn/logging';
import { createTaskRunnerLogger } from './task_runner_logger';

describe('createTaskRunnerLogger', () => {
  test('should inject baseline tags into log messages', () => {
    const logger: ReturnType<typeof loggingSystemMock.createLogger> =
      loggingSystemMock.createLogger();
    const taskRunnerLogger = createTaskRunnerLogger({ logger, tags: ['tag-1', 'tag-2'] });

    taskRunnerLogger.trace('test trace message', { tags: ['tag-3'] });
    taskRunnerLogger.debug('test debug message', { tags: ['tag-4'] });
    taskRunnerLogger.info('test info message', { tags: ['tag-5'] });
    taskRunnerLogger.warn('test warn message', { tags: ['tag-6'] });
    taskRunnerLogger.error('test error message', { tags: ['tag-7'] });
    taskRunnerLogger.fatal('test fatal message', { tags: ['tag-8'] });

    expect(logger.trace).toHaveBeenCalledWith('test trace message', {
      tags: ['tag-1', 'tag-2', 'tag-3'],
    });
    expect(logger.debug).toHaveBeenCalledWith('test debug message', {
      tags: ['tag-1', 'tag-2', 'tag-4'],
    });
    expect(logger.info).toHaveBeenCalledWith('test info message', {
      tags: ['tag-1', 'tag-2', 'tag-5'],
    });
    expect(logger.warn).toHaveBeenCalledWith('test warn message', {
      tags: ['tag-1', 'tag-2', 'tag-6'],
    });
    expect(logger.error).toHaveBeenCalledWith('test error message', {
      tags: ['tag-1', 'tag-2', 'tag-7'],
    });
    expect(logger.fatal).toHaveBeenCalledWith('test fatal message', {
      tags: ['tag-1', 'tag-2', 'tag-8'],
    });
  });

  test('should pass through other meta fields', () => {
    const logger: ReturnType<typeof loggingSystemMock.createLogger> =
      loggingSystemMock.createLogger();
    const taskRunnerLogger = createTaskRunnerLogger({ logger, tags: ['tag-1', 'tag-2'] });

    taskRunnerLogger.trace('test trace message', { labels: { foo: 'bar' } });
    taskRunnerLogger.debug('test debug message', { tags: ['tag-4'], host: { cpu: { usage: 3 } } });
    taskRunnerLogger.info('test info message');
    taskRunnerLogger.warn('test warn message', { user: { email: 'abc@124.com' } });
    taskRunnerLogger.error('test error message', { agent: { id: 'agent-1' } });
    taskRunnerLogger.fatal('test fatal message');

    expect(logger.trace).toHaveBeenCalledWith('test trace message', {
      tags: ['tag-1', 'tag-2'],
      labels: { foo: 'bar' },
    });
    expect(logger.debug).toHaveBeenCalledWith('test debug message', {
      tags: ['tag-1', 'tag-2', 'tag-4'],
      host: { cpu: { usage: 3 } },
    });
    expect(logger.info).toHaveBeenCalledWith('test info message', { tags: ['tag-1', 'tag-2'] });
    expect(logger.warn).toHaveBeenCalledWith('test warn message', {
      tags: ['tag-1', 'tag-2'],
      user: { email: 'abc@124.com' },
    });
    expect(logger.error).toHaveBeenCalledWith('test error message', {
      tags: ['tag-1', 'tag-2'],
      agent: { id: 'agent-1' },
    });
    expect(logger.fatal).toHaveBeenCalledWith('test fatal message', { tags: ['tag-1', 'tag-2'] });
  });

  test('should inject baseline labels into log messages', () => {
    const logger: ReturnType<typeof loggingSystemMock.createLogger> =
      loggingSystemMock.createLogger();
    const taskRunnerLogger = createTaskRunnerLogger({
      logger,
      tags: ['tag-1', 'tag-2'],
      labels: { ruleId: 'rule-1', ruleType: 'my-rule' },
    });

    taskRunnerLogger.trace('test trace message');
    taskRunnerLogger.debug('test debug message');
    taskRunnerLogger.info('test info message');
    taskRunnerLogger.warn('test warn message');
    taskRunnerLogger.error('test error message');
    taskRunnerLogger.fatal('test fatal message');

    const expectedLabels = { ruleId: 'rule-1', ruleType: 'my-rule' };
    expect(logger.trace).toHaveBeenCalledWith('test trace message', {
      tags: ['tag-1', 'tag-2'],
      labels: expectedLabels,
    });
    expect(logger.debug).toHaveBeenCalledWith('test debug message', {
      tags: ['tag-1', 'tag-2'],
      labels: expectedLabels,
    });
    expect(logger.info).toHaveBeenCalledWith('test info message', {
      tags: ['tag-1', 'tag-2'],
      labels: expectedLabels,
    });
    expect(logger.warn).toHaveBeenCalledWith('test warn message', {
      tags: ['tag-1', 'tag-2'],
      labels: expectedLabels,
    });
    expect(logger.error).toHaveBeenCalledWith('test error message', {
      tags: ['tag-1', 'tag-2'],
      labels: expectedLabels,
    });
    expect(logger.fatal).toHaveBeenCalledWith('test fatal message', {
      tags: ['tag-1', 'tag-2'],
      labels: expectedLabels,
    });
  });

  test('should merge baseline labels with per-call labels', () => {
    const logger: ReturnType<typeof loggingSystemMock.createLogger> =
      loggingSystemMock.createLogger();
    const taskRunnerLogger = createTaskRunnerLogger({
      logger,
      tags: ['rule-id', 'rule-type'],
      labels: { ruleId: 'rule-1', alertId: 'alert-1', spaceId: 'default' },
    });

    taskRunnerLogger.debug('first logger call', {
      labels: { taskInstanceId: 'task-1' },
    });
    taskRunnerLogger.debug('second logger call', { labels: { alertId: 'another-alert' } });

    expect(logger.debug).toHaveBeenNthCalledWith(1, 'first logger call', {
      tags: ['rule-id', 'rule-type'],
      labels: {
        ruleId: 'rule-1',
        alertId: 'alert-1',
        spaceId: 'default',
        taskInstanceId: 'task-1',
      },
    });
    expect(logger.debug).toHaveBeenNthCalledWith(2, 'second logger call', {
      tags: ['rule-id', 'rule-type'],
      labels: { ruleId: 'rule-1', alertId: 'another-alert', spaceId: 'default' },
    });
  });

  test('should pass through other functions', () => {
    const logger: ReturnType<typeof loggingSystemMock.createLogger> =
      loggingSystemMock.createLogger();
    const taskRunnerLogger = createTaskRunnerLogger({ logger, tags: ['tag-1', 'tag-2'] });

    taskRunnerLogger.isLevelEnabled('debug');
    expect(logger.isLevelEnabled).toHaveBeenCalledWith('debug');

    taskRunnerLogger.get('prefix', 'another');
    expect(logger.get).toHaveBeenCalledWith('prefix', 'another');

    const logRecord: LogRecord = {
      timestamp: new Date(),
      level: LogLevel.Info,
      context: 'context',
      message: 'message',
      pid: 1,
    };
    taskRunnerLogger.log(logRecord);
    expect(logger.log).toHaveBeenCalledWith(logRecord);
  });
});
