/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { WatchOptions } from 'chokidar';

import {
  createContinuousMode,
  createGitHookTriggerMode,
  type ContinuousModeConfig,
  type ContinuousModeController,
  type OnFileChangeCallback,
} from './continuous';
import {
  createScheduledMode,
  isValidCronExpression,
  CronPresets,
  type ScheduledModeConfig,
  type ScheduledModeController,
  type OnScheduledCallback,
} from './scheduled';

/**
 * Supported execution mode types.
 */
export type ModeType = 'continuous' | 'scheduled' | 'git-hook' | 'once';

/**
 * Union of all possible mode controller types.
 */
export type ModeController = ContinuousModeController | ScheduledModeController;

/**
 * CLI arguments for configuring execution mode.
 */
export interface ModeCliArgs {
  /**
   * The execution mode type.
   * - 'continuous': Watch files for changes and trigger evaluations
   * - 'scheduled': Run evaluations on a cron schedule
   * - 'git-hook': Watch for git hook trigger file
   * - 'once': Run once and exit (default behavior, no mode controller created)
   */
  mode?: ModeType;

  /**
   * Cron expression for scheduled mode (e.g., '0 * * * *' for every hour).
   * Only used when mode is 'scheduled'.
   */
  cron?: string;

  /**
   * Timezone for scheduled mode cron schedule.
   * Only used when mode is 'scheduled'.
   */
  timezone?: string;

  /**
   * Paths or glob patterns to watch for continuous mode.
   * Only used when mode is 'continuous'.
   */
  watchPaths?: string[];

  /**
   * Debounce time in milliseconds for continuous mode (default: 300).
   * Only used when mode is 'continuous'.
   */
  debounceMs?: number;

  /**
   * File patterns to ignore during continuous mode watching.
   * Only used when mode is 'continuous'.
   */
  ignorePatterns?: string[];

  /**
   * Directory for git hook trigger file.
   * Only used when mode is 'git-hook'.
   */
  triggerDirectory?: string;

  /**
   * Name of the git hook trigger file (default: '.kbn-evals-continuous-trigger').
   * Only used when mode is 'git-hook'.
   */
  triggerFileName?: string;

  /**
   * Whether to run immediately on start (scheduled mode) or ignore initial add events (continuous mode).
   */
  runOnStart?: boolean;
}

/**
 * Configuration for creating a mode via the factory.
 */
export interface ModeFactoryConfig {
  /**
   * Logger instance for the mode.
   */
  log: SomeDevLog;

  /**
   * CLI arguments specifying mode configuration.
   */
  cliArgs: ModeCliArgs;

  /**
   * Callback invoked when the mode triggers an evaluation.
   * For continuous mode, this is called with file change events.
   * For scheduled mode, this is called with scheduled events.
   */
  onTrigger: OnFileChangeCallback | OnScheduledCallback;

  /**
   * Callback invoked when the mode encounters an error.
   */
  onError?: (error: Error) => void;

  /**
   * Callback invoked when the mode is ready (continuous) or started (scheduled).
   */
  onReady?: () => void;

  /**
   * Additional chokidar watch options for continuous mode.
   */
  watchOptions?: WatchOptions;

  /**
   * Optional task name for scheduled mode.
   */
  taskName?: string;
}

/**
 * Result of mode factory creation.
 */
export interface ModeFactoryResult {
  /**
   * The mode type that was created.
   */
  modeType: ModeType;

  /**
   * The mode controller instance, or null for 'once' mode.
   */
  controller: ModeController | null;

  /**
   * Whether a controller was created (false for 'once' mode).
   */
  hasController: boolean;
}

/**
 * Validates CLI arguments for mode configuration.
 *
 * @param cliArgs - The CLI arguments to validate
 * @returns Validation result with errors if any
 */
export function validateModeCliArgs(cliArgs: ModeCliArgs): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { mode, cron, watchPaths } = cliArgs;

  if (mode === 'scheduled') {
    if (!cron) {
      errors.push('Scheduled mode requires a --cron expression');
    } else if (!isValidCronExpression(cron)) {
      errors.push(`Invalid cron expression: ${cron}`);
    }
  }

  if (mode === 'continuous') {
    if (!watchPaths || watchPaths.length === 0) {
      errors.push('Continuous mode requires at least one --watch-path');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parses mode-related CLI arguments from process.argv or a provided array.
 *
 * @param argv - Command line arguments (defaults to process.argv)
 * @returns Parsed ModeCliArgs
 */
export function parseModeCliArgs(argv: string[] = process.argv): ModeCliArgs {
  const args: ModeCliArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const nextArg = argv[i + 1];

    // --mode <type>
    if (arg === '--mode' && nextArg) {
      args.mode = nextArg as ModeType;
      i++;
      continue;
    }
    if (arg.startsWith('--mode=')) {
      args.mode = arg.split('=')[1] as ModeType;
      continue;
    }

    // --cron <expression>
    if (arg === '--cron' && nextArg) {
      args.cron = nextArg;
      i++;
      continue;
    }
    if (arg.startsWith('--cron=')) {
      args.cron = arg.split('=')[1];
      continue;
    }

    // --timezone <tz>
    if (arg === '--timezone' && nextArg) {
      args.timezone = nextArg;
      i++;
      continue;
    }
    if (arg.startsWith('--timezone=')) {
      args.timezone = arg.split('=')[1];
      continue;
    }

    // --watch-path <path> (can be specified multiple times)
    if (arg === '--watch-path' && nextArg) {
      args.watchPaths = args.watchPaths || [];
      args.watchPaths.push(nextArg);
      i++;
      continue;
    }
    if (arg.startsWith('--watch-path=')) {
      args.watchPaths = args.watchPaths || [];
      args.watchPaths.push(arg.split('=')[1]);
      continue;
    }

    // --debounce-ms <ms>
    if (arg === '--debounce-ms' && nextArg) {
      args.debounceMs = parseInt(nextArg, 10);
      i++;
      continue;
    }
    if (arg.startsWith('--debounce-ms=')) {
      args.debounceMs = parseInt(arg.split('=')[1], 10);
      continue;
    }

    // --ignore-pattern <pattern> (can be specified multiple times)
    if (arg === '--ignore-pattern' && nextArg) {
      args.ignorePatterns = args.ignorePatterns || [];
      args.ignorePatterns.push(nextArg);
      i++;
      continue;
    }
    if (arg.startsWith('--ignore-pattern=')) {
      args.ignorePatterns = args.ignorePatterns || [];
      args.ignorePatterns.push(arg.split('=')[1]);
      continue;
    }

    // --trigger-directory <dir>
    if (arg === '--trigger-directory' && nextArg) {
      args.triggerDirectory = nextArg;
      i++;
      continue;
    }
    if (arg.startsWith('--trigger-directory=')) {
      args.triggerDirectory = arg.split('=')[1];
      continue;
    }

    // --trigger-file-name <name>
    if (arg === '--trigger-file-name' && nextArg) {
      args.triggerFileName = nextArg;
      i++;
      continue;
    }
    if (arg.startsWith('--trigger-file-name=')) {
      args.triggerFileName = arg.split('=')[1];
      continue;
    }

    // --run-on-start (boolean flag)
    if (arg === '--run-on-start') {
      args.runOnStart = true;
      continue;
    }
  }

  return args;
}

/**
 * Creates a mode controller based on CLI arguments.
 *
 * This factory function examines the provided CLI arguments and instantiates
 * the appropriate mode controller:
 *
 * - `continuous`: Creates a file watcher that triggers on file changes
 * - `scheduled`: Creates a cron-based scheduler
 * - `git-hook`: Creates a trigger file watcher for git hook integration
 * - `once`: Returns null (no controller needed for single run)
 *
 * @param config - Factory configuration including logger, CLI args, and callbacks
 * @returns ModeFactoryResult with the controller and metadata
 *
 * @example
 * ```typescript
 * const result = createModeFromCliArgs({
 *   log,
 *   cliArgs: { mode: 'scheduled', cron: '0 * * * *' },
 *   onTrigger: async (event) => {
 *     console.log('Triggered!', event);
 *     await runEvaluations();
 *   },
 * });
 *
 * if (result.hasController) {
 *   await result.controller.start();
 * }
 * ```
 */
export function createModeFromCliArgs(config: ModeFactoryConfig): ModeFactoryResult {
  const { log, cliArgs, onTrigger, onError, onReady, watchOptions, taskName } = config;
  const mode = cliArgs.mode ?? 'once';

  // Validate arguments
  const validation = validateModeCliArgs(cliArgs);
  if (!validation.valid) {
    const errorMessage = `Invalid mode configuration: ${validation.errors.join('; ')}`;
    log.error(errorMessage);
    throw new Error(errorMessage);
  }

  switch (mode) {
    case 'continuous': {
      const continuousConfig: ContinuousModeConfig = {
        log,
        watchPaths: cliArgs.watchPaths!,
        debounceMs: cliArgs.debounceMs,
        onFileChange: onTrigger as OnFileChangeCallback,
        onError,
        onReady,
        ignorePatterns: cliArgs.ignorePatterns,
        watchOptions,
      };

      return {
        modeType: 'continuous',
        controller: createContinuousMode(continuousConfig),
        hasController: true,
      };
    }

    case 'scheduled': {
      const scheduledConfig: ScheduledModeConfig = {
        log,
        cronExpression: cliArgs.cron!,
        timezone: cliArgs.timezone,
        onScheduled: onTrigger as OnScheduledCallback,
        onError,
        onStart: onReady,
        runOnStart: cliArgs.runOnStart,
        taskName,
      };

      return {
        modeType: 'scheduled',
        controller: createScheduledMode(scheduledConfig),
        hasController: true,
      };
    }

    case 'git-hook': {
      const gitHookConfig = {
        log,
        triggerDirectory: cliArgs.triggerDirectory,
        triggerFileName: cliArgs.triggerFileName,
        onFileChange: onTrigger as OnFileChangeCallback,
        onError,
        onReady,
      };

      return {
        modeType: 'git-hook',
        controller: createGitHookTriggerMode(gitHookConfig),
        hasController: true,
      };
    }

    case 'once':
    default: {
      log.debug('Running in "once" mode - no mode controller created');
      return {
        modeType: 'once',
        controller: null,
        hasController: false,
      };
    }
  }
}

/**
 * Type guard to check if a mode controller is a ContinuousModeController.
 */
export function isContinuousModeController(
  controller: ModeController | null
): controller is ContinuousModeController {
  return controller !== null && 'flush' in controller && 'addPaths' in controller;
}

/**
 * Type guard to check if a mode controller is a ScheduledModeController.
 */
export function isScheduledModeController(
  controller: ModeController | null
): controller is ScheduledModeController {
  return controller !== null && 'setCronExpression' in controller && 'trigger' in controller;
}

/**
 * Helper to get a cron preset by name.
 *
 * @param presetName - Name of the preset (e.g., 'EVERY_HOUR', 'DAILY_MIDNIGHT')
 * @returns The cron expression or undefined if not found
 */
export function getCronPreset(
  presetName: keyof typeof CronPresets
): (typeof CronPresets)[keyof typeof CronPresets] | undefined {
  return CronPresets[presetName];
}

/**
 * Displays help text for mode CLI arguments.
 */
export function getModeCliHelp(): string {
  return `
Mode Configuration Options:
  --mode <type>           Execution mode: continuous, scheduled, git-hook, or once (default: once)
  
Scheduled Mode Options:
  --cron <expression>     Cron expression for scheduling (e.g., '0 * * * *' for every hour)
  --timezone <tz>         Timezone for cron schedule (e.g., 'America/New_York')
  --run-on-start          Run immediately when scheduler starts
  
Continuous Mode Options:
  --watch-path <path>     Path or glob to watch (can be specified multiple times)
  --debounce-ms <ms>      Debounce delay in milliseconds (default: 300)
  --ignore-pattern <pat>  Pattern to ignore (can be specified multiple times)
  
Git Hook Mode Options:
  --trigger-directory <d> Directory for trigger file (default: cwd)
  --trigger-file-name <n> Trigger file name (default: '.kbn-evals-continuous-trigger')

Cron Expression Presets:
  EVERY_MINUTE       * * * * *
  EVERY_5_MINUTES    */5 * * * *
  EVERY_15_MINUTES   */15 * * * *
  EVERY_30_MINUTES   */30 * * * *
  EVERY_HOUR         0 * * * *
  EVERY_6_HOURS      0 */6 * * *
  EVERY_12_HOURS     0 */12 * * *
  DAILY_MIDNIGHT     0 0 * * *
  DAILY_6AM          0 6 * * *
  DAILY_NOON         0 12 * * *
  WEEKLY_SUNDAY      0 0 * * 0
  WEEKLY_MONDAY      0 0 * * 1
  MONTHLY_FIRST      0 0 1 * *
`;
}

// Re-export CronPresets for convenience
export { CronPresets };
