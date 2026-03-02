/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';

/**
 * Represents a scheduled task execution event.
 */
export interface ScheduledEvent {
  /** Timestamp when the task was triggered */
  triggeredAt: Date;
  /** The cron expression that triggered the event */
  cronExpression: string;
  /** Execution number since the scheduler started */
  executionNumber: number;
  /** Previous execution timestamp (if any) */
  previousExecution?: Date;
  /** Next scheduled execution timestamp */
  nextExecution?: Date;
}

/**
 * Callback invoked when a scheduled task is triggered.
 */
export type OnScheduledCallback = (event: ScheduledEvent) => void | Promise<void>;

/**
 * Configuration for scheduled mode cron-based execution.
 */
export interface ScheduledModeConfig {
  /** Logger instance */
  log: SomeDevLog;
  /** Cron expression for scheduling (e.g., '0 * * * *' for every hour) */
  cronExpression: string;
  /** Timezone for cron schedule (default: system timezone) */
  timezone?: string;
  /** Callback invoked when the scheduled task is triggered */
  onScheduled?: OnScheduledCallback;
  /** Callback invoked when the scheduler encounters an error */
  onError?: (error: Error) => void;
  /** Callback invoked when the scheduler is started */
  onStart?: () => void;
  /** Whether to run immediately on start before the first scheduled execution (default: false) */
  runOnStart?: boolean;
  /** Optional name/identifier for the scheduled task */
  taskName?: string;
}

/**
 * Status of the scheduled mode scheduler.
 */
export type ScheduledModeStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error';

/**
 * Statistics about the scheduled mode scheduler.
 */
export interface ScheduledModeStats {
  /** Number of scheduled executions completed */
  executionsCompleted: number;
  /** Number of executions that failed */
  executionsFailed: number;
  /** Last execution timestamp */
  lastExecutionAt?: Date;
  /** Next scheduled execution timestamp */
  nextExecutionAt?: Date;
  /** Time the scheduler started */
  startedAt?: Date;
  /** Total uptime in milliseconds */
  uptimeMs: number;
  /** The cron expression being used */
  cronExpression: string;
  /** Average execution duration in milliseconds */
  averageExecutionDurationMs: number;
}

/**
 * Controller for managing the scheduled mode scheduler.
 */
export interface ScheduledModeController {
  /** Start the scheduled task */
  start: () => Promise<void>;
  /** Stop the scheduled task */
  stop: () => Promise<void>;
  /** Get current scheduler status */
  getStatus: () => ScheduledModeStatus;
  /** Get scheduler statistics */
  getStats: () => ScheduledModeStats;
  /** Manually trigger the scheduled callback */
  trigger: () => Promise<void>;
  /** Check if the scheduler is active */
  isActive: () => boolean;
  /** Update the cron expression (requires restart) */
  setCronExpression: (expression: string) => void;
  /** Get the next scheduled execution date */
  getNextExecution: () => Date | undefined;
}

/**
 * Validates a cron expression format.
 * Supports standard 5-field cron expressions (minute, hour, day of month, month, day of week).
 *
 * @param expression - The cron expression to validate
 * @returns true if the expression is valid, false otherwise
 */
export function isValidCronExpression(expression: string): boolean {
  // Basic validation for 5-field cron expressions
  // Format: minute hour day-of-month month day-of-week
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 5) {
    return false;
  }

  const patterns = [
    /^(\*|([0-5]?\d)((-[0-5]?\d)|(,[0-5]?\d)*)?)(\/\d+)?$/, // minute (0-59)
    /^(\*|([01]?\d|2[0-3])((-([01]?\d|2[0-3]))|(,([01]?\d|2[0-3]))*)?)(\/\d+)?$/, // hour (0-23)
    /^(\*|([1-9]|[12]\d|3[01])((-([1-9]|[12]\d|3[01]))|(,([1-9]|[12]\d|3[01]))*)?)(\/\d+)?$/, // day of month (1-31)
    /^(\*|(1[0-2]|[1-9])((-((1[0-2]|[1-9])))|(,((1[0-2]|[1-9])))*)?)(\/\d+)?$/, // month (1-12)
    /^(\*|[0-6]((-[0-6])|(,[0-6])*)?)(\/\d+)?$/, // day of week (0-6)
  ];

  return parts.every((part, index) => patterns[index].test(part));
}

/**
 * Common cron expression presets for convenience.
 */
export const CronPresets = {
  /** Every minute */
  EVERY_MINUTE: '* * * * *',
  /** Every 5 minutes */
  EVERY_5_MINUTES: '*/5 * * * *',
  /** Every 15 minutes */
  EVERY_15_MINUTES: '*/15 * * * *',
  /** Every 30 minutes */
  EVERY_30_MINUTES: '*/30 * * * *',
  /** Every hour */
  EVERY_HOUR: '0 * * * *',
  /** Every 6 hours */
  EVERY_6_HOURS: '0 */6 * * *',
  /** Every 12 hours */
  EVERY_12_HOURS: '0 */12 * * *',
  /** Daily at midnight */
  DAILY_MIDNIGHT: '0 0 * * *',
  /** Daily at 6 AM */
  DAILY_6AM: '0 6 * * *',
  /** Daily at noon */
  DAILY_NOON: '0 12 * * *',
  /** Weekly on Sunday at midnight */
  WEEKLY_SUNDAY: '0 0 * * 0',
  /** Weekly on Monday at midnight */
  WEEKLY_MONDAY: '0 0 * * 1',
  /** Monthly on the 1st at midnight */
  MONTHLY_FIRST: '0 0 1 * *',
} as const;

/**
 * Creates a scheduled mode controller that runs evaluations on a cron schedule
 * using node-cron.
 *
 * @param config - Configuration for the scheduled mode
 * @returns ScheduledModeController instance
 *
 * @example
 * ```typescript
 * const controller = createScheduledMode({
 *   log,
 *   cronExpression: '0 * * * *', // Every hour
 *   timezone: 'America/New_York',
 *   onScheduled: async (event) => {
 *     console.log(`Running scheduled evaluation #${event.executionNumber}`);
 *     await runEvaluations();
 *   },
 * });
 *
 * await controller.start();
 * // ... scheduler is now active
 * await controller.stop();
 * ```
 */
export function createScheduledMode(config: ScheduledModeConfig): ScheduledModeController {
  const {
    log,
    cronExpression: initialCronExpression,
    timezone,
    onScheduled,
    onError,
    onStart,
    runOnStart = false,
    taskName = 'kbn-evals-scheduled-task',
  } = config;

  let task: { stop: () => void } | null = null;
  let status: ScheduledModeStatus = 'idle';
  let currentCronExpression = initialCronExpression;
  let startedAt: Date | undefined;
  let lastExecutionAt: Date | undefined;
  let executionsCompleted = 0;
  let executionsFailed = 0;
  let totalExecutionDurationMs = 0;
  let executionNumber = 0;
  let isExecuting = false;

  /**
   * Execute the scheduled callback.
   */
  async function executeCallback(triggeredAt: Date): Promise<void> {
    if (isExecuting) {
      log.warn('Skipping scheduled execution - previous execution still running');
      return;
    }

    isExecuting = true;
    executionNumber++;
    const startTime = Date.now();
    const previousExecution = lastExecutionAt;

    log.info(`Executing scheduled task: ${taskName} (execution #${executionNumber})`);

    const event: ScheduledEvent = {
      triggeredAt,
      cronExpression: currentCronExpression,
      executionNumber,
      previousExecution,
      nextExecution: getNextExecution(),
    };

    try {
      if (onScheduled) {
        await onScheduled(event);
      }

      executionsCompleted++;
      lastExecutionAt = triggeredAt;
      const durationMs = Date.now() - startTime;
      totalExecutionDurationMs += durationMs;

      log.info(`Scheduled task completed in ${durationMs}ms`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      executionsFailed++;
      log.error(`Scheduled task failed: ${err.message}`);

      if (onError) {
        onError(err);
      }
    } finally {
      isExecuting = false;
    }
  }

  /**
   * Get the next scheduled execution date.
   */
  function getNextExecution(): Date | undefined {
    if (!task || status !== 'running') {
      return undefined;
    }

    try {
      // node-cron doesn't expose next execution directly, but we can calculate it
      // using a simple approach based on the cron expression
      // This is a simplified calculation - for complex expressions, use a dedicated library
      return calculateNextExecution(currentCronExpression, timezone);
    } catch {
      return undefined;
    }
  }

  /**
   * Calculate the next execution time from a cron expression.
   * This is a simplified implementation.
   */
  function calculateNextExecution(expression: string, tz?: string): Date | undefined {
    try {
      // Use cron-parser if available, otherwise return undefined
      // For now, we'll return a simple estimate based on the expression
      const now = new Date();
      const parts = expression.split(/\s+/);

      if (parts[0] === '*') {
        // Every minute
        const next = new Date(now);
        next.setSeconds(0, 0);
        next.setMinutes(next.getMinutes() + 1);
        return next;
      }

      if (parts[0].startsWith('*/')) {
        // Every N minutes
        const interval = parseInt(parts[0].substring(2), 10);
        const next = new Date(now);
        next.setSeconds(0, 0);
        const currentMinute = next.getMinutes();
        const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval;
        next.setMinutes(nextMinute >= 60 ? 0 : nextMinute);
        if (nextMinute >= 60) {
          next.setHours(next.getHours() + 1);
        }
        return next;
      }

      // For more complex expressions, return undefined
      // A full implementation would use cron-parser
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Start the scheduled task.
   */
  async function start(): Promise<void> {
    if (status === 'running' || status === 'starting') {
      log.warn('Scheduled mode is already active');
      return;
    }

    status = 'starting';

    // Validate cron expression
    if (!isValidCronExpression(currentCronExpression)) {
      const err = new Error(`Invalid cron expression: ${currentCronExpression}`);
      status = 'error';
      log.error(err.message);
      if (onError) {
        onError(err);
      }
      throw err;
    }

    log.info(`Starting scheduled mode with cron: ${currentCronExpression}`);

    try {
      // Dynamically import node-cron to avoid bundling issues
      // node-cron should be installed as a workspace dev dependency
      // eslint-disable-next-line @kbn/imports/no_unresolvable_imports
      const cron = await import(/* webpackIgnore: true */ 'node-cron');

      const options: { scheduled: boolean; timezone?: string; name?: string } = {
        scheduled: true,
        name: taskName,
      };

      if (timezone) {
        options.timezone = timezone;
      }

      task = cron.schedule(
        currentCronExpression,
        async () => {
          await executeCallback(new Date());
        },
        options
      );

      status = 'running';
      startedAt = new Date();

      log.info(`Scheduled mode started: ${taskName}`);

      if (onStart) {
        onStart();
      }

      // Run immediately if configured
      if (runOnStart) {
        log.info('Running initial scheduled task execution');
        await executeCallback(new Date());
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      status = 'error';
      log.error(`Failed to start scheduled mode: ${err.message}`);

      if (onError) {
        onError(err);
      }

      throw err;
    }
  }

  /**
   * Stop the scheduled task.
   */
  async function stop(): Promise<void> {
    if (status === 'stopped' || status === 'stopping') {
      return;
    }

    status = 'stopping';
    log.info('Stopping scheduled mode');

    if (task) {
      task.stop();
      task = null;
    }

    // Wait for any running execution to complete
    if (isExecuting) {
      log.info('Waiting for current execution to complete...');
      // Poll until execution completes (with timeout)
      const timeout = 30000; // 30 seconds
      const startWait = Date.now();
      while (isExecuting && Date.now() - startWait < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (isExecuting) {
        log.warn('Timed out waiting for execution to complete');
      }
    }

    status = 'stopped';
    log.info('Scheduled mode stopped');
  }

  /**
   * Get the current scheduler status.
   */
  function getStatus(): ScheduledModeStatus {
    return status;
  }

  /**
   * Get scheduler statistics.
   */
  function getStats(): ScheduledModeStats {
    const averageExecutionDurationMs =
      executionsCompleted > 0 ? totalExecutionDurationMs / executionsCompleted : 0;

    return {
      executionsCompleted,
      executionsFailed,
      lastExecutionAt,
      nextExecutionAt: getNextExecution(),
      startedAt,
      uptimeMs: startedAt ? Date.now() - startedAt.getTime() : 0,
      cronExpression: currentCronExpression,
      averageExecutionDurationMs,
    };
  }

  /**
   * Manually trigger the scheduled callback.
   */
  async function trigger(): Promise<void> {
    log.info('Manually triggering scheduled task');
    await executeCallback(new Date());
  }

  /**
   * Check if the scheduler is currently active.
   */
  function isActive(): boolean {
    return status === 'running';
  }

  /**
   * Update the cron expression.
   * Note: Requires restart to take effect.
   */
  function setCronExpression(expression: string): void {
    if (!isValidCronExpression(expression)) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }

    currentCronExpression = expression;
    log.info(`Cron expression updated to: ${expression}`);

    if (status === 'running') {
      log.warn('Scheduler restart required for new cron expression to take effect');
    }
  }

  return {
    start,
    stop,
    getStatus,
    getStats,
    trigger,
    isActive,
    setCronExpression,
    getNextExecution,
  };
}

/**
 * Type for the scheduled mode controller instance.
 */
export type ScheduledMode = ReturnType<typeof createScheduledMode>;
