/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
// eslint-disable-next-line @kbn/eslint/require_kbn_fs
import { existsSync, mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { Logger } from '@kbn/logging';

// SuiteRunner reads/writes files OUTSIDE Kibana's data/ directory — specifically
// `.git` (to resolve main-worktree path) and `.scout/servers/local.json` (to
// sync Scout config with the live kibana/es URLs). `@kbn/fs` sandboxes all I/O
// to `data/`, which is not where these files live, so we use native `fs` here.

export interface ServerInfo {
  kibanaUrl: string;
  elasticsearchUrl: string;
}

export interface SuiteRunConfig {
  suiteId: string;
  configPath: string;
  connectorId: string;
  project?: string;
  repetitions?: number;
  grep?: string;
}

export interface SuiteRunStatus {
  runId: string;
  suiteId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  exitCode?: number;
  error?: string;
  output: string[];
  /**
   * The kbn-evals `run_id` that the Playwright/Scout process produced and
   * exported to Elasticsearch under `kibana-evaluations*`. Parsed from the
   * scout-worker log line that every experiment emits. Shared across all
   * projects in a multi-project suite run (one eval run_id per SuiteRun),
   * so the first match is authoritative. Undefined until the first
   * experiment finishes and logs its score export message.
   *
   * Used by the UI to cross-link into /runs/{evalRunId} for score details
   * and trace correlation.
   */
  evalRunId?: string;
}

const MAX_RUNS_HISTORY = 10;
const MAX_OUTPUT_LINES = 200;
const PROCESS_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Matches the "Overall" row of the kbn-evals ASCII results table, e.g.:
 *   ║ Overall                  │ 3 │                      mean: 0.42 ║
 * Captures the mean score as group 1. The table uses box-drawing
 * characters which render differently in terminals vs log files; we
 * match on "Overall" + "mean:" rather than the border glyphs to be
 * robust to ANSI color stripping and box style variants.
 */
const OVERALL_MEAN_REGEX = /Overall\s*[│|]\s*\d+\s*[│|]\s*mean:\s*([\d.]+)/;

/**
 * Matches the "run_id" segment of the kbn-evals score-export log line:
 *   You can query the data using: environment.hostname:"..." AND
 *   task.model.id:"..." AND run_id:"5ede1fceaacc7a6e"
 * Source: report_model_score.ts in @kbn/evals. The format is
 * deterministic so a tight regex is safe.
 */
const EVAL_RUN_ID_REGEX = /\brun_id:"([^"]+)"/;

/** Patterns that indicate startup noise rather than meaningful test output */
const NOISE_PATTERNS = [
  /^\{".+"\s*:\s*/, // JSON objects (APM agent config, structured logs from startup)
  /^Debugger listening on ws:\/\//, // Node inspector
  /^For help, see:/, // Node inspector help
  /^warning:.*deprecated/i, // Deprecation warnings
];

const isNoiseLine = (line: string): boolean => NOISE_PATTERNS.some((pattern) => pattern.test(line));

// Strip non-SGR ANSI sequences (cursor movement, erase line, etc.) — useless in a log viewer.
// Preserves SGR color codes (\x1b[...m) for frontend rendering.

const ANSI_CONTROL_REGEX = /\x1b\[[0-9;]*[A-HJKSTfn]/g;

const sanitizeLine = (line: string): string => line.replace(ANSI_CONTROL_REGEX, '').trim();

/**
 * If running inside a git worktree, resolve the main repo root so we can
 * find runtime artifacts like .scout/servers that only exist there.
 */
const resolveMainRepoRoot = (worktreeRoot: string): string | undefined => {
  const gitPath = resolve(worktreeRoot, '.git');
  if (!existsSync(gitPath) || !statSync(gitPath).isFile()) return undefined;

  const content = readFileSync(gitPath, 'utf-8').trim();
  // In a worktree, .git is a file: "gitdir: /main/repo/.git/worktrees/<name>"
  const match = content.match(/^gitdir:\s+(.+)$/);
  if (!match) return undefined;

  return resolve(resolve(worktreeRoot, match[1]), '..', '..', '..');
};

/**
 * Internal bookkeeping per run, kept private so it doesn't pollute the
 * public `SuiteRunStatus` API. Populated from the Playwright process
 * stdout/stderr as lines stream in.
 */
interface RunInternalState {
  /** True once we've observed at least one "Overall ... mean: X" line. */
  sawOverallTable: boolean;
  /** True if any observed Overall mean was strictly greater than zero. */
  sawPositiveOverallMean: boolean;
}

export class SuiteRunner {
  private runs = new Map<string, SuiteRunStatus>();
  private internalState = new Map<string, RunInternalState>();
  private activeRunId: string | null = null;

  constructor(
    private readonly repoRoot: string,
    private readonly logger: Logger,
    serverInfo?: ServerInfo
  ) {
    this.ensureWorktreeArtifacts();
    if (serverInfo) {
      this.syncScoutConfig(serverInfo);
    }
  }

  /**
   * When running from a git worktree, runtime artifacts like .scout/servers
   * only exist in the main repo. Symlink them so Playwright can find them.
   */
  private ensureWorktreeArtifacts(): void {
    const scoutDir = resolve(this.repoRoot, '.scout');
    if (existsSync(scoutDir)) return;

    const mainRoot = resolveMainRepoRoot(this.repoRoot);
    if (!mainRoot) return;

    const mainScoutDir = resolve(mainRoot, '.scout');
    if (!existsSync(mainScoutDir)) return;

    try {
      symlinkSync(mainScoutDir, scoutDir);
      this.logger.info(`[SuiteRunner] Symlinked .scout from main repo root: ${mainRoot}`);
    } catch (err) {
      this.logger.warn(
        `[SuiteRunner] Failed to symlink .scout: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  /**
   * Update .scout/servers/local.json to point at the currently running Kibana
   * so eval suite runs connect to the right instance.
   *
   * Called from the plugin's `start()` once the real Kibana/ES URLs are known.
   * Safe to call multiple times — no-ops if URLs haven't changed.
   *
   * NOTE: When running inside a git worktree, `.scout` is symlinked to the
   * main repo's `.scout` directory, so this config is **shared across all
   * worktrees**. Running two worktrees' eval suites simultaneously is unsafe
   * — last writer wins. Sequential use is fine.
   */
  public syncScoutConfig({ kibanaUrl, elasticsearchUrl }: ServerInfo): void {
    const configPath = resolve(this.repoRoot, '.scout', 'servers', 'local.json');

    try {
      if (existsSync(configPath)) {
        const existing = JSON.parse(readFileSync(configPath, 'utf-8'));
        const currentKibana = existing?.hosts?.kibana;
        const currentEs = existing?.hosts?.elasticsearch;

        if (currentKibana === kibanaUrl && currentEs === elasticsearchUrl) return;

        existing.hosts = { ...existing.hosts, kibana: kibanaUrl, elasticsearch: elasticsearchUrl };
        writeFileSync(configPath, JSON.stringify(existing, null, 2));
        this.logger.info(
          `[SuiteRunner] Updated Scout config: kibana ${currentKibana} → ${kibanaUrl}, es ${currentEs} → ${elasticsearchUrl}`
        );
      } else {
        const scoutDir = resolve(this.repoRoot, '.scout', 'servers');
        mkdirSync(scoutDir, { recursive: true });
        const config = {
          serverless: false,
          hosts: { kibana: kibanaUrl, elasticsearch: elasticsearchUrl },
          auth: { username: 'elastic', password: 'changeme' },
        };
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        this.logger.info(
          `[SuiteRunner] Created Scout config: kibana=${kibanaUrl}, es=${elasticsearchUrl}`
        );
      }
    } catch (err) {
      this.logger.warn(
        `[SuiteRunner] Failed to sync Scout config: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  startRun(config: SuiteRunConfig): SuiteRunStatus {
    if (this.activeRunId) {
      const activeRun = this.runs.get(this.activeRunId);
      if (activeRun?.status === 'running') {
        throw new Error(
          `A suite run is already in progress: ${activeRun.suiteId} (${this.activeRunId})`
        );
      }
    }

    const runId = randomUUID();
    const now = new Date().toISOString();

    const status: SuiteRunStatus = {
      runId,
      suiteId: config.suiteId,
      status: 'running',
      startedAt: now,
      output: [],
    };

    this.runs.set(runId, status);
    this.internalState.set(runId, {
      sawOverallTable: false,
      sawPositiveOverallMean: false,
    });
    this.activeRunId = runId;

    // Trim old runs
    if (this.runs.size > MAX_RUNS_HISTORY) {
      const entries = Array.from(this.runs.entries());
      const toRemove = entries
        .filter(([id]) => id !== runId)
        .sort((a, b) => a[1].startedAt.localeCompare(b[1].startedAt))
        .slice(0, this.runs.size - MAX_RUNS_HISTORY);
      for (const [id] of toRemove) {
        this.runs.delete(id);
        this.internalState.delete(id);
      }
    }

    this.spawnProcess(runId, config);
    return status;
  }

  getStatus(runId: string): SuiteRunStatus | undefined {
    return this.runs.get(runId);
  }

  getCurrentRun(): SuiteRunStatus | undefined {
    if (!this.activeRunId) return undefined;
    return this.runs.get(this.activeRunId);
  }

  listRuns(): SuiteRunStatus[] {
    return Array.from(this.runs.values())
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, MAX_RUNS_HISTORY);
  }

  private spawnProcess(runId: string, config: SuiteRunConfig): void {
    const configAbsPath = resolve(this.repoRoot, config.configPath);

    const args = ['scripts/playwright', 'test', '--config', configAbsPath];
    if (config.project) {
      args.push('--project', config.project);
    }
    if (config.grep) {
      args.push('--grep', config.grep);
    }

    const env: Record<string, string> = {
      ...process.env,
      EVALUATION_CONNECTOR_ID: config.connectorId,
      EVAL_SUITE_ID: config.suiteId,
    };

    if (config.repetitions) {
      env.EVALUATION_REPETITIONS = String(config.repetitions);
    }

    this.logger.info(
      `[SuiteRunner] Starting suite "${config.suiteId}" (run: ${runId}): node ${args.join(' ')}`
    );

    try {
      const child = spawn('node', args, {
        cwd: this.repoRoot,
        env,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.unref();

      // Capture stdout/stderr into the run's output ring buffer, and
      // inline-parse kbn-evals result tables so we don't rely on the
      // buffer (which only retains the last MAX_OUTPUT_LINES lines and
      // may drop early experiments in multi-project suites).
      const appendOutput = (chunk: Buffer) => {
        const run = this.runs.get(runId);
        const internal = this.internalState.get(runId);
        if (!run) return;
        const lines = chunk
          .toString('utf-8')
          .split('\n')
          .map(sanitizeLine)
          .filter((line) => line.length > 0 && !isNoiseLine(line));

        if (internal) {
          for (const line of lines) {
            // Track eval scores from the Overall results row.
            const meanMatch = line.match(OVERALL_MEAN_REGEX);
            if (meanMatch) {
              const mean = parseFloat(meanMatch[1]);
              if (!Number.isNaN(mean)) {
                internal.sawOverallTable = true;
                if (mean > 0) internal.sawPositiveOverallMean = true;
              }
            }

            // Capture the kbn-evals run_id the first time it's logged.
            // All experiments in a multi-project run share the same id,
            // so first-match-wins is correct.
            if (!run.evalRunId) {
              const idMatch = line.match(EVAL_RUN_ID_REGEX);
              if (idMatch) {
                run.evalRunId = idMatch[1];
              }
            }
          }
        }

        run.output.push(...lines);
        if (run.output.length > MAX_OUTPUT_LINES) {
          run.output.splice(0, run.output.length - MAX_OUTPUT_LINES);
        }
      };

      if (child.stdout) {
        child.stdout.on('data', appendOutput);
      }
      if (child.stderr) {
        child.stderr.on('data', appendOutput);
      }

      // Timeout safety net
      const timeout = setTimeout(() => {
        const run = this.runs.get(runId);
        if (run?.status === 'running') {
          this.logger.warn(`[SuiteRunner] Run ${runId} timed out after ${PROCESS_TIMEOUT_MS}ms`);
          run.status = 'failed';
          run.error = 'Process timed out';
          run.completedAt = new Date().toISOString();
          if (this.activeRunId === runId) this.activeRunId = null;
          try {
            child.kill('SIGTERM');
          } catch {
            // Process may already be gone
          }
        }
      }, PROCESS_TIMEOUT_MS);

      child.on('exit', (code) => {
        clearTimeout(timeout);
        const run = this.runs.get(runId);
        const internal = this.internalState.get(runId);
        if (run) {
          run.exitCode = code ?? undefined;
          run.completedAt = new Date().toISOString();

          // Non-zero exit is an unambiguous failure.
          if (code !== 0) {
            run.status = 'failed';
            if (!run.error) run.error = `Process exited with code ${code}`;
          } else if (internal?.sawOverallTable && !internal.sawPositiveOverallMean) {
            // Playwright exited 0 (no test threw), but every observed
            // "Overall" row in the kbn-evals results table had mean: 0
            // — the suite ran to completion but the evaluation failed.
            // Mark it failed so the UI doesn't show a green checkmark
            // for a run where every scored example was wrong.
            run.status = 'failed';
            run.error = 'All evaluator scores were zero';
          } else {
            run.status = 'completed';
          }

          this.logger.info(
            `[SuiteRunner] Suite "${config.suiteId}" (run: ${runId}) finished with code ${code}, status: ${run.status}`
          );
        }
        if (this.activeRunId === runId) this.activeRunId = null;
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        const run = this.runs.get(runId);
        if (run) {
          run.status = 'failed';
          run.error = err.message;
          run.completedAt = new Date().toISOString();
        }
        if (this.activeRunId === runId) this.activeRunId = null;
        this.logger.error(
          `[SuiteRunner] Failed to spawn suite "${config.suiteId}": ${err.message}`
        );
      });
    } catch (err) {
      const run = this.runs.get(runId);
      if (run) {
        run.status = 'failed';
        run.error = err instanceof Error ? err.message : String(err);
        run.completedAt = new Date().toISOString();
      }
      if (this.activeRunId === runId) this.activeRunId = null;
    }
  }
}
