/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, statSync, symlinkSync } from 'fs';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from '@kbn/fs';
import type { Logger } from '@kbn/logging';

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
}

const MAX_RUNS_HISTORY = 10;
const MAX_OUTPUT_LINES = 200;
const PROCESS_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

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

  const content = (readFileSync(gitPath, 'utf-8') as string).trim();
  // In a worktree, .git is a file: "gitdir: /main/repo/.git/worktrees/<name>"
  const match = content.match(/^gitdir:\s+(.+)$/);
  if (!match) return undefined;

  return resolve(resolve(worktreeRoot, match[1]), '..', '..', '..');
};

export class SuiteRunner {
  private runs = new Map<string, SuiteRunStatus>();
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
   */
  private syncScoutConfig({ kibanaUrl, elasticsearchUrl }: ServerInfo): void {
    const configPath = resolve(this.repoRoot, '.scout', 'servers', 'local.json');

    try {
      if (existsSync(configPath)) {
        const existing = JSON.parse(readFileSync(configPath, 'utf-8') as string);
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

      // Capture stdout/stderr into the run's output ring buffer
      const appendOutput = (chunk: Buffer) => {
        const run = this.runs.get(runId);
        if (!run) return;
        const lines = chunk
          .toString('utf-8')
          .split('\n')
          .map(sanitizeLine)
          .filter((line) => line.length > 0 && !isNoiseLine(line));
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
        if (run) {
          run.exitCode = code ?? undefined;
          run.status = code === 0 ? 'completed' : 'failed';
          run.completedAt = new Date().toISOString();
          if (code !== 0 && !run.error) {
            run.error = `Process exited with code ${code}`;
          }
          this.logger.info(
            `[SuiteRunner] Suite "${config.suiteId}" (run: ${runId}) finished with code ${code}`
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
