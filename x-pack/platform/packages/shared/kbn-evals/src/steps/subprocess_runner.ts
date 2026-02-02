/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn, type SpawnOptions, type ChildProcess } from 'node:child_process';
import type { SomeDevLog } from '@kbn/some-dev-log';

/**
 * Configuration for running eval suites via subprocess.
 */
export interface RunEvalSuiteSubprocessConfig {
  /** Path to the Playwright config file (using createPlaywrightEvalsConfig) */
  configPath: string;
  /** Optional project/connector ID to run (filters to specific connector) */
  project?: string;
  /** Optional specific test files to run */
  testFiles?: string[];
  /** Optional grep pattern to filter tests */
  grep?: string;
  /** Optional grep to invert (exclude tests matching pattern) */
  grepInvert?: string;
  /** Environment variables to pass to the subprocess */
  env?: Record<string, string>;
  /** Timeout in milliseconds (default: 30 minutes) */
  timeout?: number;
  /** Number of workers for parallel execution */
  workers?: number;
  /** Whether to run in headed mode */
  headed?: boolean;
  /** Logger instance */
  log?: SomeDevLog;
  /** Working directory (defaults to repo root) */
  cwd?: string;
  /** Path to Node.js binary (defaults to process.execPath) */
  nodePath?: string;
  /** Path to Playwright scripts (defaults to scripts/playwright.js) */
  playwrightScriptPath?: string;
  /** Whether to capture stdout/stderr (default: true if log provided, false otherwise) */
  captureOutput?: boolean;
}

/**
 * Result from running an eval suite subprocess.
 */
export interface RunEvalSuiteSubprocessResult {
  /** Exit code from the subprocess */
  exitCode: number;
  /** Whether the subprocess completed successfully (exitCode === 0) */
  success: boolean;
  /** Duration in milliseconds */
  durationMs: number;
  /** Timestamp when the subprocess started */
  startedAt: string;
  /** Timestamp when the subprocess completed */
  completedAt: string;
  /** Captured stdout (if captureOutput is true) */
  stdout?: string;
  /** Captured stderr (if captureOutput is true) */
  stderr?: string;
  /** Signal if the process was killed */
  signal?: NodeJS.Signals;
  /** Error if the process failed to start */
  error?: Error;
}

/**
 * Error class for subprocess execution failures.
 */
export class EvalSuiteSubprocessError extends Error {
  constructor(message: string, public readonly result: RunEvalSuiteSubprocessResult) {
    super(message);
    this.name = 'EvalSuiteSubprocessError';
  }
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Runs an eval suite via subprocess using Playwright.
 *
 * This function spawns a child process that runs `node scripts/playwright test`
 * with the specified config path (which should use `createPlaywrightEvalsConfig`).
 *
 * @example
 * ```typescript
 * const result = await runEvalSuiteSubprocess({
 *   configPath: 'x-pack/solutions/security/test/security_solution_evals/playwright.config.ts',
 *   project: 'azure-gpt4o',
 *   env: {
 *     EVALUATION_CONNECTOR_ID: 'my-connector',
 *     EVALUATION_REPETITIONS: '3',
 *   },
 *   log,
 * });
 *
 * if (result.success) {
 *   console.log(`Eval suite completed in ${result.durationMs}ms`);
 * }
 * ```
 *
 * @param config - Configuration for the subprocess execution
 * @returns Promise resolving to the subprocess result
 */
export async function runEvalSuiteSubprocess(
  config: RunEvalSuiteSubprocessConfig
): Promise<RunEvalSuiteSubprocessResult> {
  const {
    configPath,
    project,
    testFiles = [],
    grep,
    grepInvert,
    env = {},
    timeout = DEFAULT_TIMEOUT_MS,
    workers,
    headed,
    log,
    cwd,
    nodePath = process.execPath,
    playwrightScriptPath = 'scripts/playwright.js',
    captureOutput = !!log,
  } = config;

  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  // Build command arguments
  const args = buildPlaywrightArgs({
    configPath,
    project,
    testFiles,
    grep,
    grepInvert,
    workers,
    headed,
  });

  log?.info(`🎭 Starting eval suite subprocess`);
  log?.debug(`Config: ${configPath}`);
  log?.debug(`Command: ${nodePath} ${playwrightScriptPath} ${args.join(' ')}`);

  const spawnOptions: SpawnOptions = {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    stdio: captureOutput ? 'pipe' : 'inherit',
  };

  let childProcess: ChildProcess;
  let stdout = '';
  let stderr = '';
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    childProcess = spawn(nodePath, [playwrightScriptPath, ...args], spawnOptions);

    // Set up output capture
    if (captureOutput) {
      childProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        log?.write(`[🎭] ${text}`);
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        log?.error(`[🎭] ${text}`);
      });
    }

    // Set up timeout
    const timeoutPromise = new Promise<{ signal: NodeJS.Signals }>((_, reject) => {
      timeoutId = setTimeout(() => {
        childProcess.kill('SIGTERM');
        // Give it a moment to terminate gracefully, then force kill
        setTimeout(() => {
          if (!childProcess.killed) {
            childProcess.kill('SIGKILL');
          }
        }, 5000);
        reject(new Error(`Eval suite subprocess timed out after ${timeout}ms`));
      }, timeout);
    });

    // Wait for process to complete
    const processPromise = new Promise<{ exitCode: number; signal?: NodeJS.Signals }>(
      (resolve, reject) => {
        childProcess.on('close', (code, signal) => {
          resolve({ exitCode: code ?? 1, signal: signal ?? undefined });
        });

        childProcess.on('error', (error) => {
          reject(error);
        });
      }
    );

    const { exitCode, signal } = await Promise.race([processPromise, timeoutPromise]);

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    const result: RunEvalSuiteSubprocessResult = {
      exitCode,
      success: exitCode === 0,
      durationMs,
      startedAt,
      completedAt,
      signal,
      ...(captureOutput && { stdout, stderr }),
    };

    if (result.success) {
      log?.info(`✅ Eval suite subprocess completed successfully in ${durationMs}ms`);
    } else {
      log?.error(`❌ Eval suite subprocess failed with exit code ${exitCode}`);
    }

    return result;
  } catch (error) {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));

    log?.error(`❌ Eval suite subprocess error: ${err.message}`);

    return {
      exitCode: 1,
      success: false,
      durationMs,
      startedAt,
      completedAt,
      error: err,
      ...(captureOutput && { stdout, stderr }),
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Builds the Playwright command arguments.
 */
function buildPlaywrightArgs(options: {
  configPath: string;
  project?: string;
  testFiles?: string[];
  grep?: string;
  grepInvert?: string;
  workers?: number;
  headed?: boolean;
}): string[] {
  const { configPath, project, testFiles = [], grep, grepInvert, workers, headed } = options;

  const args = ['test', `--config=${configPath}`];

  // Add test files if specified
  if (testFiles.length > 0) {
    args.push(...testFiles);
  }

  // Add project filter if specified
  if (project) {
    args.push(`--project=${project}`);
  }

  // Add grep patterns
  if (grep) {
    args.push(`--grep=${grep}`);
  }

  if (grepInvert) {
    args.push(`--grep-invert=${grepInvert}`);
  }

  // Add workers
  if (workers !== undefined) {
    args.push(`--workers=${workers}`);
  }

  // Add headed mode
  if (headed) {
    args.push('--headed');
  }

  return args;
}

/**
 * Options for running multiple eval suites.
 */
export interface RunMultipleEvalSuitesConfig {
  /** Array of suite configurations to run */
  suites: Array<Omit<RunEvalSuiteSubprocessConfig, 'log' | 'cwd' | 'nodePath'>>;
  /** Whether to run suites in parallel (default: false - sequential) */
  parallel?: boolean;
  /** Maximum parallel suites when parallel is true (default: 2) */
  maxParallel?: number;
  /** Logger instance */
  log?: SomeDevLog;
  /** Working directory (defaults to repo root) */
  cwd?: string;
  /** Path to Node.js binary (defaults to process.execPath) */
  nodePath?: string;
  /** Stop on first failure (default: false) */
  stopOnFailure?: boolean;
}

/**
 * Result from running multiple eval suites.
 */
export interface RunMultipleEvalSuitesResult {
  /** Overall success (all suites passed) */
  success: boolean;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Number of successful suites */
  successCount: number;
  /** Number of failed suites */
  failureCount: number;
  /** Results for each suite */
  results: Array<{
    configPath: string;
    result: RunEvalSuiteSubprocessResult;
  }>;
}

/**
 * Runs multiple eval suites via subprocess.
 *
 * @example
 * ```typescript
 * const result = await runMultipleEvalSuites({
 *   suites: [
 *     { configPath: 'path/to/suite1/playwright.config.ts' },
 *     { configPath: 'path/to/suite2/playwright.config.ts', project: 'azure-gpt4o' },
 *   ],
 *   parallel: true,
 *   log,
 * });
 *
 * console.log(`${result.successCount}/${result.results.length} suites passed`);
 * ```
 *
 * @param config - Configuration for running multiple suites
 * @returns Promise resolving to the combined result
 */
export async function runMultipleEvalSuites(
  config: RunMultipleEvalSuitesConfig
): Promise<RunMultipleEvalSuitesResult> {
  const {
    suites,
    parallel = false,
    maxParallel = 2,
    log,
    cwd,
    nodePath,
    stopOnFailure = false,
  } = config;

  const startTime = Date.now();
  const results: Array<{ configPath: string; result: RunEvalSuiteSubprocessResult }> = [];

  log?.info(
    `🚀 Running ${suites.length} eval suites (${
      parallel ? `parallel, max ${maxParallel}` : 'sequential'
    })`
  );

  if (parallel) {
    // Run suites in parallel with concurrency limit
    const pLimit = (await import('p-limit')).default;
    const limiter = pLimit(maxParallel);

    const promises = suites.map((suite, index) =>
      limiter(async () => {
        log?.info(`📊 Starting suite ${index + 1}/${suites.length}: "${suite.configPath}"`);

        const result = await runEvalSuiteSubprocess({
          ...suite,
          log,
          cwd,
          nodePath,
        });

        return { configPath: suite.configPath, result };
      })
    );

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  } else {
    // Run suites sequentially
    for (let i = 0; i < suites.length; i++) {
      const suite = suites[i];
      log?.info(`📊 Running suite ${i + 1}/${suites.length}: "${suite.configPath}"`);

      const result = await runEvalSuiteSubprocess({
        ...suite,
        log,
        cwd,
        nodePath,
      });

      results.push({ configPath: suite.configPath, result });

      if (stopOnFailure && !result.success) {
        log?.warning(`⚠️ Stopping due to failure in suite: ${suite.configPath}`);
        break;
      }
    }
  }

  const totalDurationMs = Date.now() - startTime;
  const successCount = results.filter((r) => r.result.success).length;
  const failureCount = results.filter((r) => !r.result.success).length;
  const success = failureCount === 0;

  log?.info(
    `${success ? '✅' : '❌'} Completed ${
      results.length
    } eval suites: ${successCount} passed, ${failureCount} failed in ${totalDurationMs}ms`
  );

  return {
    success,
    totalDurationMs,
    successCount,
    failureCount,
    results,
  };
}

/**
 * Creates a configured eval suite subprocess runner with preset defaults.
 *
 * @example
 * ```typescript
 * const runner = createEvalSuiteSubprocessRunner({
 *   log,
 *   cwd: REPO_ROOT,
 *   defaultEnv: {
 *     EVALUATION_CONNECTOR_ID: 'default-connector',
 *   },
 * });
 *
 * // Run a single suite
 * const result = await runner.run({
 *   configPath: 'path/to/playwright.config.ts',
 * });
 *
 * // Run multiple suites
 * const batchResult = await runner.runMultiple({
 *   suites: [
 *     { configPath: 'path/to/suite1/playwright.config.ts' },
 *     { configPath: 'path/to/suite2/playwright.config.ts' },
 *   ],
 * });
 * ```
 */
export function createEvalSuiteSubprocessRunner(defaults: {
  log?: SomeDevLog;
  cwd?: string;
  nodePath?: string;
  playwrightScriptPath?: string;
  defaultEnv?: Record<string, string>;
  defaultTimeout?: number;
}) {
  const { log, cwd, nodePath, playwrightScriptPath, defaultEnv = {}, defaultTimeout } = defaults;

  return {
    /**
     * Run a single eval suite.
     */
    run: (config: Omit<RunEvalSuiteSubprocessConfig, 'log' | 'cwd' | 'nodePath'>) =>
      runEvalSuiteSubprocess({
        ...config,
        env: { ...defaultEnv, ...config.env },
        timeout: config.timeout ?? defaultTimeout,
        log,
        cwd,
        nodePath,
        playwrightScriptPath,
      }),

    /**
     * Run multiple eval suites.
     */
    runMultiple: (
      config: Omit<RunMultipleEvalSuitesConfig, 'log' | 'cwd' | 'nodePath'> & {
        suites: Array<Omit<RunEvalSuiteSubprocessConfig, 'log' | 'cwd' | 'nodePath'>>;
      }
    ) =>
      runMultipleEvalSuites({
        ...config,
        suites: config.suites.map((suite) => ({
          ...suite,
          env: { ...defaultEnv, ...suite.env },
          timeout: suite.timeout ?? defaultTimeout,
        })),
        log,
        cwd,
        nodePath,
      }),
  };
}

/**
 * Type for the eval suite subprocess runner instance.
 */
export type EvalSuiteSubprocessRunner = ReturnType<typeof createEvalSuiteSubprocessRunner>;
