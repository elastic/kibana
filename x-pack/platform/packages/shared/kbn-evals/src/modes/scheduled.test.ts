/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  createScheduledMode,
  isValidCronExpression,
  CronPresets,
  type ScheduledEvent,
} from './scheduled';

// Mock node-cron
const mockTask = {
  stop: jest.fn(),
};

jest.mock(
  'node-cron',
  () => ({
    schedule: jest.fn((_expression: string, callback: () => void, _options: unknown) => {
      // Store callback for testing
      (mockTask as any).callback = callback;
      return mockTask;
    }),
  }),
  { virtual: true }
);

const createMockLog = (): jest.Mocked<SomeDevLog> => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  write: jest.fn(),
  verbose: jest.fn(),
  success: jest.fn(),
});

describe('isValidCronExpression', () => {
  it('should validate correct cron expressions', () => {
    expect(isValidCronExpression('* * * * *')).toBe(true);
    expect(isValidCronExpression('0 * * * *')).toBe(true);
    expect(isValidCronExpression('*/5 * * * *')).toBe(true);
    expect(isValidCronExpression('0 0 * * *')).toBe(true);
    expect(isValidCronExpression('0 0 1 * *')).toBe(true);
    expect(isValidCronExpression('0 0 * * 0')).toBe(true);
    expect(isValidCronExpression('30 6 * * 1-5')).toBe(true);
    expect(isValidCronExpression('0 12 1 1 *')).toBe(true);
  });

  it('should reject invalid cron expressions', () => {
    expect(isValidCronExpression('')).toBe(false);
    expect(isValidCronExpression('* * * *')).toBe(false); // 4 fields
    expect(isValidCronExpression('* * * * * *')).toBe(false); // 6 fields
    expect(isValidCronExpression('60 * * * *')).toBe(false); // invalid minute
    expect(isValidCronExpression('* 24 * * *')).toBe(false); // invalid hour
    expect(isValidCronExpression('* * 32 * *')).toBe(false); // invalid day of month
    expect(isValidCronExpression('* * * 13 *')).toBe(false); // invalid month
    expect(isValidCronExpression('* * * * 7')).toBe(false); // invalid day of week
    expect(isValidCronExpression('invalid')).toBe(false);
  });
});

describe('CronPresets', () => {
  it('should have valid cron expressions', () => {
    Object.values(CronPresets).forEach((preset) => {
      expect(isValidCronExpression(preset)).toBe(true);
    });
  });

  it('should have expected preset values', () => {
    expect(CronPresets.EVERY_MINUTE).toBe('* * * * *');
    expect(CronPresets.EVERY_HOUR).toBe('0 * * * *');
    expect(CronPresets.DAILY_MIDNIGHT).toBe('0 0 * * *');
    expect(CronPresets.WEEKLY_MONDAY).toBe('0 0 * * 1');
  });
});

describe('createScheduledMode', () => {
  let mockLog: jest.Mocked<SomeDevLog>;
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @kbn/imports/no_unresolvable_imports
  const mockCron = require('node-cron');

  beforeEach(() => {
    jest.clearAllMocks();
    mockLog = createMockLog();
  });

  describe('initialization', () => {
    it('should create a controller with all required methods', () => {
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '* * * * *',
      });

      expect(controller.start).toBeDefined();
      expect(controller.stop).toBeDefined();
      expect(controller.getStatus).toBeDefined();
      expect(controller.getStats).toBeDefined();
      expect(controller.trigger).toBeDefined();
      expect(controller.isActive).toBeDefined();
      expect(controller.setCronExpression).toBeDefined();
      expect(controller.getNextExecution).toBeDefined();
    });

    it('should start with idle status', () => {
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '* * * * *',
      });

      expect(controller.getStatus()).toBe('idle');
      expect(controller.isActive()).toBe(false);
    });
  });

  describe('start', () => {
    it('should start the scheduler and call onStart callback', async () => {
      const onStart = jest.fn();
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '0 * * * *',
        onStart,
      });

      await controller.start();

      expect(controller.getStatus()).toBe('running');
      expect(controller.isActive()).toBe(true);
      expect(onStart).toHaveBeenCalled();
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 * * * *',
        expect.any(Function),
        expect.objectContaining({ scheduled: true })
      );
    });

    it('should use timezone when provided', async () => {
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '0 * * * *',
        timezone: 'America/New_York',
      });

      await controller.start();

      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 * * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'America/New_York' })
      );
    });

    it('should warn if already running', async () => {
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '* * * * *',
      });

      await controller.start();
      await controller.start();

      expect(mockLog.warn).toHaveBeenCalledWith(expect.stringContaining('already active'));
    });

    it('should throw error for invalid cron expression', async () => {
      const onError = jest.fn();
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: 'invalid',
        onError,
      });

      await expect(controller.start()).rejects.toThrow('Invalid cron expression');
      expect(controller.getStatus()).toBe('error');
      expect(onError).toHaveBeenCalled();
    });

    it('should run immediately if runOnStart is true', async () => {
      const onScheduled = jest.fn();
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '0 * * * *',
        runOnStart: true,
        onScheduled,
      });

      await controller.start();

      expect(onScheduled).toHaveBeenCalledTimes(1);
      expect(onScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          executionNumber: 1,
          cronExpression: '0 * * * *',
        })
      );
    });
  });

  describe('scheduled execution', () => {
    it('should call onScheduled when triggered', async () => {
      const onScheduled = jest.fn();
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '* * * * *',
        onScheduled,
      });

      await controller.start();

      // Simulate cron trigger
      await (mockTask as any).callback();

      expect(onScheduled).toHaveBeenCalledTimes(1);
      const event: ScheduledEvent = onScheduled.mock.calls[0][0];
      expect(event.executionNumber).toBe(1);
      expect(event.cronExpression).toBe('* * * * *');
      expect(event.triggeredAt).toBeInstanceOf(Date);
    });

    it('should track execution statistics', async () => {
      const onScheduled = jest.fn();
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '* * * * *',
        onScheduled,
      });

      await controller.start();

      // Simulate multiple triggers
      await (mockTask as any).callback();
      await (mockTask as any).callback();

      const stats = controller.getStats();
      expect(stats.executionsCompleted).toBe(2);
      expect(stats.executionsFailed).toBe(0);
      expect(stats.lastExecutionAt).toBeDefined();
      expect(stats.startedAt).toBeDefined();
    });

    it('should handle execution errors and track failed executions', async () => {
      const onScheduled = jest.fn().mockRejectedValue(new Error('Execution error'));
      const onError = jest.fn();
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '* * * * *',
        onScheduled,
        onError,
      });

      await controller.start();
      await (mockTask as any).callback();

      expect(onError).toHaveBeenCalled();
      const stats = controller.getStats();
      expect(stats.executionsCompleted).toBe(0);
      expect(stats.executionsFailed).toBe(1);
    });
  });

  describe('stop', () => {
    it('should stop the scheduler', async () => {
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '* * * * *',
      });

      await controller.start();
      await controller.stop();

      expect(controller.getStatus()).toBe('stopped');
      expect(mockTask.stop).toHaveBeenCalled();
    });
  });

  describe('trigger', () => {
    it('should manually trigger execution', async () => {
      const onScheduled = jest.fn();
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '0 * * * *',
        onScheduled,
      });

      await controller.start();
      await controller.trigger();

      expect(onScheduled).toHaveBeenCalledTimes(1);
      expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('Manually triggering'));
    });
  });

  describe('setCronExpression', () => {
    it('should update the cron expression', () => {
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '* * * * *',
      });

      controller.setCronExpression('0 0 * * *');

      const stats = controller.getStats();
      expect(stats.cronExpression).toBe('0 0 * * *');
    });

    it('should throw error for invalid expression', () => {
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '* * * * *',
      });

      expect(() => controller.setCronExpression('invalid')).toThrow('Invalid cron expression');
    });

    it('should warn if scheduler is running', async () => {
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '* * * * *',
      });

      await controller.start();
      controller.setCronExpression('0 * * * *');

      expect(mockLog.warn).toHaveBeenCalledWith(expect.stringContaining('restart required'));
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', async () => {
      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '*/5 * * * *',
      });

      await controller.start();

      const stats = controller.getStats();
      expect(stats.cronExpression).toBe('*/5 * * * *');
      expect(stats.executionsCompleted).toBe(0);
      expect(stats.executionsFailed).toBe(0);
      expect(stats.startedAt).toBeDefined();
      expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average execution duration', async () => {
      const onScheduled = jest.fn().mockImplementation(async () => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const controller = createScheduledMode({
        log: mockLog,
        cronExpression: '* * * * *',
        onScheduled,
      });

      await controller.start();
      await (mockTask as any).callback();
      await (mockTask as any).callback();

      const stats = controller.getStats();
      expect(stats.averageExecutionDurationMs).toBeGreaterThan(0);
    });
  });
});
