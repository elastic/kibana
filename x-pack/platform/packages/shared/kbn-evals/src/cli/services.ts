/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { createHash } from 'crypto';
import { spawn, type SpawnOptions } from 'child_process';
import type { ToolingLog } from '@kbn/tooling-log';

const EVALS_DIR = 'target/evals';
const STATE_FILE = 'target/evals/services.json';
const DEFAULT_SERVER_CONFIG_SET = 'evals_tracing';

export type ServiceName = 'edot' | 'scout';

interface ServiceEntry {
  pid: number;
  logFile: string;
  startedAt: string;
  /** SHA-256 of KIBANA_TESTING_AI_CONNECTORS at boot time (Scout only) */
  connectorsHash?: string;
  /** The serverConfigSet used to start Scout */
  serverConfigSet?: string;
}

interface ServicesState {
  edot?: ServiceEntry;
  scout?: ServiceEntry;
}

const ensureDir = (repoRoot: string) => {
  const dir = Path.join(repoRoot, EVALS_DIR);
  Fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const readState = (repoRoot: string): ServicesState => {
  const file = Path.join(repoRoot, STATE_FILE);
  if (!Fs.existsSync(file)) return {};
  try {
    return JSON.parse(Fs.readFileSync(file, 'utf-8')) as ServicesState;
  } catch {
    return {};
  }
};

const writeState = (repoRoot: string, state: ServicesState) => {
  ensureDir(repoRoot);
  Fs.writeFileSync(Path.join(repoRoot, STATE_FILE), JSON.stringify(state, null, 2) + '\n');
};

export const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

export const connectorsHash = (): string => {
  const raw = process.env.KIBANA_TESTING_AI_CONNECTORS ?? '';
  return createHash('sha256').update(raw).digest('hex').slice(0, 12);
};

export const isServiceRunning = (repoRoot: string, name: ServiceName): boolean => {
  const state = readState(repoRoot);
  const entry = state[name];
  return !!entry && isAlive(entry.pid);
};

/**
 * Returns true if the running Scout was started with a different set of connectors
 * than what's currently in the environment, or with a different serverConfigSet.
 */
export const isScoutStale = (
  repoRoot: string,
  requestedConfigSet?: string
): { stale: boolean; reason?: string } => {
  const state = readState(repoRoot);
  const entry = state.scout;
  if (!entry || !isAlive(entry.pid)) return { stale: false };

  if (entry.connectorsHash !== connectorsHash()) {
    return { stale: true, reason: 'KIBANA_TESTING_AI_CONNECTORS changed' };
  }

  const runningConfigSet = entry.serverConfigSet ?? DEFAULT_SERVER_CONFIG_SET;
  const targetConfigSet = requestedConfigSet ?? DEFAULT_SERVER_CONFIG_SET;

  if (runningConfigSet !== targetConfigSet) {
    return {
      stale: true,
      reason: `serverConfigSet changed (running: ${
        entry.serverConfigSet ?? DEFAULT_SERVER_CONFIG_SET
      }, requested: ${targetConfigSet})`,
    };
  }

  return { stale: false };
};

/**
 * Spawn a detached service process. Stdout/stderr are written to a log file.
 * Returns the child PID.
 */
export const startService = (
  repoRoot: string,
  name: ServiceName,
  command: string,
  args: string[],
  log: ToolingLog,
  opts?: {
    connectorsHash?: string;
    serverConfigSet?: string;
    env?: Record<string, string | undefined>;
  }
): number => {
  const dir = ensureDir(repoRoot);
  const logFile = Path.join(dir, `${name}.log`);

  // Truncate previous log
  Fs.writeFileSync(logFile, '');

  const fd = Fs.openSync(logFile, 'a');
  const spawnOpts: SpawnOptions = {
    cwd: repoRoot,
    detached: true,
    stdio: ['ignore', fd, fd],
    env: { ...process.env, ...opts?.env },
  };

  const child = spawn(command, args, spawnOpts);
  child.unref();
  Fs.closeSync(fd);

  const pid = child.pid!;
  log.info(`[${name}] started (PID ${pid}, log: ${Path.relative(repoRoot, logFile)})`);

  const state = readState(repoRoot);
  state[name] = {
    pid,
    logFile: Path.relative(repoRoot, logFile),
    startedAt: new Date().toISOString(),
    ...(opts?.connectorsHash ? { connectorsHash: opts.connectorsHash } : {}),
    ...(opts?.serverConfigSet ? { serverConfigSet: opts.serverConfigSet } : {}),
  };
  writeState(repoRoot, state);

  return pid;
};

/**
 * Stop a service by PID. Sends SIGTERM, waits briefly, then SIGKILL if needed.
 */
export const stopService = async (
  repoRoot: string,
  name: ServiceName,
  log: ToolingLog
): Promise<boolean> => {
  const state = readState(repoRoot);
  const entry = state[name];

  if (!entry) {
    log.info(`[${name}] no tracked process`);
    return false;
  }

  if (!isAlive(entry.pid)) {
    log.info(`[${name}] already stopped (PID ${entry.pid})`);
    delete state[name];
    writeState(repoRoot, state);
    return false;
  }

  log.info(`[${name}] stopping (PID ${entry.pid})...`);

  // Kill the process group (negative PID) so Scout's child ES/Kibana processes also die
  try {
    process.kill(-entry.pid, 'SIGTERM');
  } catch {
    try {
      process.kill(entry.pid, 'SIGTERM');
    } catch {
      // already dead
    }
  }

  // Wait up to 10s for graceful shutdown
  const deadline = Date.now() + 10_000;
  while (isAlive(entry.pid) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
  }

  if (isAlive(entry.pid)) {
    log.warning(`[${name}] did not stop gracefully, sending SIGKILL`);
    try {
      process.kill(-entry.pid, 'SIGKILL');
    } catch {
      try {
        process.kill(entry.pid, 'SIGKILL');
      } catch {
        // already dead
      }
    }
  }

  log.info(`[${name}] stopped`);
  delete state[name];
  writeState(repoRoot, state);
  return true;
};

export const stopAll = async (repoRoot: string, log: ToolingLog): Promise<void> => {
  // Stop Scout first (it has child processes), then EDOT
  await stopService(repoRoot, 'scout', log);
  await stopService(repoRoot, 'edot', log);
};

/**
 * Tail a service log file, streaming new lines to the ToolingLog.
 * Returns a cleanup function to stop tailing.
 */
export const tailLog = (
  repoRoot: string,
  name: ServiceName,
  log: ToolingLog,
  opts?: { fromStart?: boolean }
): (() => void) => {
  const state = readState(repoRoot);
  const entry = state[name];
  if (!entry) {
    log.warning(`[${name}] no tracked process`);
    return () => {};
  }

  const logPath = Path.resolve(repoRoot, entry.logFile);
  if (!Fs.existsSync(logPath)) {
    log.warning(`[${name}] log file not found: ${entry.logFile}`);
    return () => {};
  }

  const tailArgs = ['-f'];
  if (!opts?.fromStart) {
    tailArgs.push('-n', '0');
  }
  tailArgs.push(logPath);

  const child = spawn('tail', tailArgs, { stdio: ['ignore', 'pipe', 'ignore'] });

  let buffer = '';
  child.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf-8');
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      log.info(`[${name}] ${line}`);
    }
  });

  return () => {
    child.kill();
  };
};
