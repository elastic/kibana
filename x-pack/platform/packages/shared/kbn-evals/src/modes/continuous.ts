/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FSWatcher, WatchOptions } from 'chokidar';
import type { SomeDevLog } from '@kbn/some-dev-log';

/**
 * File change event types that trigger continuous mode actions.
 */
export type FileChangeEventType = 'add' | 'change' | 'unlink';

/**
 * Represents a file change event.
 */
export interface FileChangeEvent {
  /** Type of change (add, change, unlink) */
  type: FileChangeEventType;
  /** Absolute path to the changed file */
  path: string;
  /** Timestamp of the change */
  timestamp: Date;
  /** Stats of the file (if available) */
  stats?: {
    size: number;
    mtime: Date;
  };
}

/**
 * Callback invoked when file changes are detected.
 */
export type OnFileChangeCallback = (events: FileChangeEvent[]) => void | Promise<void>;

/**
 * Configuration for continuous mode file watching.
 */
export interface ContinuousModeConfig {
  /** Logger instance */
  log: SomeDevLog;
  /** Paths or glob patterns to watch */
  watchPaths: string[];
  /** Optional chokidar watch options */
  watchOptions?: WatchOptions;
  /** Debounce time in milliseconds before triggering callback (default: 300) */
  debounceMs?: number;
  /** Callback invoked when file changes are detected */
  onFileChange?: OnFileChangeCallback;
  /** Callback invoked when the watcher encounters an error */
  onError?: (error: Error) => void;
  /** Callback invoked when the watcher is ready */
  onReady?: () => void;
  /** File patterns to ignore (in addition to defaults) */
  ignorePatterns?: string[];
  /** Whether to persist debounce events across rapid changes (default: true) */
  accumulateEvents?: boolean;
  /** Optional git hooks directory path for alternative triggering */
  gitHooksPath?: string;
}

/**
 * Status of the continuous mode watcher.
 */
export type ContinuousModeStatus =
  | 'idle'
  | 'starting'
  | 'watching'
  | 'stopping'
  | 'stopped'
  | 'error';

/**
 * Statistics about the continuous mode watcher.
 */
export interface ContinuousModeStats {
  /** Number of files being watched */
  watchedFilesCount: number;
  /** Number of change events processed */
  eventsProcessed: number;
  /** Number of callbacks triggered */
  callbacksTriggered: number;
  /** Last event timestamp */
  lastEventAt?: Date;
  /** Time the watcher started */
  startedAt?: Date;
  /** Total uptime in milliseconds */
  uptimeMs: number;
}

/**
 * Controller for managing the continuous mode watcher.
 */
export interface ContinuousModeController {
  /** Start watching for file changes */
  start: () => Promise<void>;
  /** Stop watching for file changes */
  stop: () => Promise<void>;
  /** Get current watcher status */
  getStatus: () => ContinuousModeStatus;
  /** Get watcher statistics */
  getStats: () => ContinuousModeStats;
  /** Add additional paths to watch */
  addPaths: (paths: string[]) => void;
  /** Remove paths from watching */
  removePaths: (paths: string[]) => void;
  /** Manually trigger the callback with current pending events */
  flush: () => Promise<void>;
  /** Check if the watcher is active */
  isActive: () => boolean;
}

/**
 * Default patterns to ignore during file watching.
 */
const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/target/**',
  '**/*.log',
  '**/.DS_Store',
  '**/coverage/**',
  '**/.cache/**',
];

/**
 * Creates a continuous mode controller that watches for file changes
 * and triggers callbacks using chokidar or git hooks.
 *
 * @param config - Configuration for the continuous mode
 * @returns ContinuousModeController instance
 *
 * @example
 * ```typescript
 * const controller = createContinuousMode({
 *   log,
 *   watchPaths: ['./src/prompts/**\/*.ts', './src/agents/**\/*.ts'],
 *   debounceMs: 500,
 *   onFileChange: async (events) => {
 *     console.log(`Detected ${events.length} changes`);
 *     await runEvaluations();
 *   },
 * });
 *
 * await controller.start();
 * // ... watcher is now active
 * await controller.stop();
 * ```
 */
export function createContinuousMode(config: ContinuousModeConfig): ContinuousModeController {
  const {
    log,
    watchPaths,
    watchOptions = {},
    debounceMs = 300,
    onFileChange,
    onError,
    onReady,
    ignorePatterns = [],
    accumulateEvents = true,
    gitHooksPath,
  } = config;

  let watcher: FSWatcher | null = null;
  let status: ContinuousModeStatus = 'idle';
  let startedAt: Date | undefined;
  let lastEventAt: Date | undefined;
  let eventsProcessed = 0;
  let callbacksTriggered = 0;

  // Event accumulation for debouncing
  let pendingEvents: FileChangeEvent[] = [];
  let debounceTimer: NodeJS.Timeout | null = null;

  /**
   * Process and dispatch accumulated events.
   */
  async function dispatchEvents(): Promise<void> {
    if (pendingEvents.length === 0) {
      return;
    }

    const events = [...pendingEvents];
    pendingEvents = [];

    log.debug(`Dispatching ${events.length} file change events`);

    callbacksTriggered++;

    if (onFileChange) {
      try {
        await onFileChange(events);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.error(`Error in file change callback: ${err.message}`);
        if (onError) {
          onError(err);
        }
      }
    }
  }

  /**
   * Schedule event dispatch with debouncing.
   */
  function scheduleDispatch(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      await dispatchEvents();
    }, debounceMs);
  }

  /**
   * Handle a file change event.
   */
  function handleFileEvent(
    type: FileChangeEventType,
    path: string,
    stats?: { size: number; mtime: Date }
  ): void {
    eventsProcessed++;
    lastEventAt = new Date();

    const event: FileChangeEvent = {
      type,
      path,
      timestamp: lastEventAt,
      stats,
    };

    log.debug(`File ${type}: ${path}`);

    if (accumulateEvents) {
      // Remove any existing event for the same path to avoid duplicates
      pendingEvents = pendingEvents.filter((e) => e.path !== path);
      pendingEvents.push(event);
    } else {
      pendingEvents = [event];
    }

    scheduleDispatch();
  }

  /**
   * Set up git hook integration if configured.
   */
  async function setupGitHooks(): Promise<void> {
    if (!gitHooksPath) {
      return;
    }

    const fs = await import('fs');
    const path = await import('path');

    const hookTypes = ['pre-commit', 'post-commit', 'post-merge', 'post-checkout'];

    for (const hookType of hookTypes) {
      const hookPath = path.join(gitHooksPath, hookType);

      // Check if hook exists and append our trigger
      try {
        const existingContent = await fs.promises
          .readFile(hookPath, 'utf-8')
          .catch(() => '#!/bin/sh\n');

        const marker = '# kbn-evals-continuous-mode';
        if (!existingContent.includes(marker)) {
          const triggerScript = `
${marker}
# Trigger continuous mode evaluation
if [ -f ".kbn-evals-continuous-trigger" ]; then
  touch ".kbn-evals-continuous-trigger"
fi
`;
          await fs.promises.writeFile(hookPath, existingContent + triggerScript, { mode: 0o755 });
          log.debug(`Installed continuous mode hook: ${hookType}`);
        }
      } catch (error) {
        log.debug(`Could not set up git hook ${hookType}: ${error}`);
      }
    }
  }

  /**
   * Start the file watcher.
   */
  async function start(): Promise<void> {
    if (status === 'watching' || status === 'starting') {
      log.warn('Continuous mode is already active');
      return;
    }

    status = 'starting';
    log.info(`Starting continuous mode, watching: ${watchPaths.join(', ')}`);

    try {
      // Dynamically import chokidar to avoid bundling issues
      // chokidar is a workspace dev dependency available at runtime
      // eslint-disable-next-line import/no-extraneous-dependencies
      const chokidar = await import('chokidar');

      // Merge ignore patterns
      const ignored = [...DEFAULT_IGNORE_PATTERNS, ...ignorePatterns];

      watcher = chokidar.watch(watchPaths, {
        persistent: true,
        ignoreInitial: true,
        ignored,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
        ...watchOptions,
      });

      watcher.on('add', (path, stats) => {
        handleFileEvent('add', path, stats ? { size: stats.size, mtime: stats.mtime } : undefined);
      });

      watcher.on('change', (path, stats) => {
        handleFileEvent(
          'change',
          path,
          stats ? { size: stats.size, mtime: stats.mtime } : undefined
        );
      });

      watcher.on('unlink', (path) => {
        handleFileEvent('unlink', path);
      });

      watcher.on('error', (error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        log.error(`Watcher error: ${err.message}`);
        status = 'error';
        if (onError) {
          onError(err);
        }
      });

      watcher.on('ready', () => {
        status = 'watching';
        startedAt = new Date();
        log.info('Continuous mode is ready and watching for changes');
        if (onReady) {
          onReady();
        }
      });

      // Set up git hooks if configured
      await setupGitHooks();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      status = 'error';
      log.error(`Failed to start continuous mode: ${err.message}`);
      if (onError) {
        onError(err);
      }
      throw err;
    }
  }

  /**
   * Stop the file watcher.
   */
  async function stop(): Promise<void> {
    if (status === 'stopped' || status === 'stopping') {
      return;
    }

    status = 'stopping';
    log.info('Stopping continuous mode');

    // Clear any pending debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    // Dispatch any remaining events
    if (pendingEvents.length > 0) {
      await dispatchEvents();
    }

    if (watcher) {
      await watcher.close();
      watcher = null;
    }

    status = 'stopped';
    log.info('Continuous mode stopped');
  }

  /**
   * Get the current watcher status.
   */
  function getStatus(): ContinuousModeStatus {
    return status;
  }

  /**
   * Get watcher statistics.
   */
  function getStats(): ContinuousModeStats {
    const watchedPaths = watcher?.getWatched() ?? {};
    const watchedFilesCount = Object.values(watchedPaths).reduce(
      (count, files) => count + files.length,
      0
    );

    return {
      watchedFilesCount,
      eventsProcessed,
      callbacksTriggered,
      lastEventAt,
      startedAt,
      uptimeMs: startedAt ? Date.now() - startedAt.getTime() : 0,
    };
  }

  /**
   * Add paths to watch.
   */
  function addPaths(paths: string[]): void {
    if (watcher) {
      watcher.add(paths);
      log.debug(`Added paths to watch: ${paths.join(', ')}`);
    }
  }

  /**
   * Remove paths from watching.
   */
  function removePaths(paths: string[]): void {
    if (watcher) {
      watcher.unwatch(paths);
      log.debug(`Removed paths from watch: ${paths.join(', ')}`);
    }
  }

  /**
   * Manually flush pending events.
   */
  async function flush(): Promise<void> {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    await dispatchEvents();
  }

  /**
   * Check if the watcher is currently active.
   */
  function isActive(): boolean {
    return status === 'watching';
  }

  return {
    start,
    stop,
    getStatus,
    getStats,
    addPaths,
    removePaths,
    flush,
    isActive,
  };
}

/**
 * Type for the continuous mode controller instance.
 */
export type ContinuousMode = ReturnType<typeof createContinuousMode>;

/**
 * Creates a git hook trigger file watcher that listens for trigger file touches
 * as an alternative to direct chokidar file watching.
 *
 * This is useful when you want to integrate with existing git hooks without
 * modifying them, or when running in environments where file watching is unreliable.
 *
 * @param config - Configuration (subset of ContinuousModeConfig)
 * @returns ContinuousModeController instance
 */
export function createGitHookTriggerMode(
  config: Omit<ContinuousModeConfig, 'watchPaths'> & {
    /** Directory to watch for trigger file (default: current working directory) */
    triggerDirectory?: string;
    /** Name of the trigger file (default: '.kbn-evals-continuous-trigger') */
    triggerFileName?: string;
  }
): ContinuousModeController {
  const {
    triggerDirectory = process.cwd(),
    triggerFileName = '.kbn-evals-continuous-trigger',
    ...restConfig
  } = config;

  // Build trigger path using simple string concatenation to avoid require
  const separator = triggerDirectory.includes('\\') ? '\\' : '/';
  const normalizedDir = triggerDirectory.endsWith(separator)
    ? triggerDirectory.slice(0, -1)
    : triggerDirectory;
  const triggerPath = `${normalizedDir}${separator}${triggerFileName}`;

  return createContinuousMode({
    ...restConfig,
    watchPaths: [triggerPath],
    watchOptions: {
      // For trigger files, we want to be very responsive
      awaitWriteFinish: false,
    },
    debounceMs: 50, // Quick response for explicit triggers
    accumulateEvents: false,
  });
}

/**
 * Utility to create a trigger file for git hook integration.
 * Call this from your git hooks to trigger the continuous mode.
 *
 * @param triggerDirectory - Directory to create the trigger file in (default: cwd)
 * @param triggerFileName - Name of the trigger file
 */
export async function touchTriggerFile(
  triggerDirectory: string = process.cwd(),
  triggerFileName: string = '.kbn-evals-continuous-trigger'
): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  const triggerPath = path.join(triggerDirectory, triggerFileName);
  const now = new Date();

  try {
    await fs.promises.utimes(triggerPath, now, now);
  } catch {
    // File doesn't exist, create it
    await fs.promises.writeFile(triggerPath, `Triggered at ${now.toISOString()}\n`);
  }
}
