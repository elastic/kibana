/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { spawnSync } from 'child_process';

const HOOK_TIMEOUT_MS = 60_000;

const isStringRecord = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((entry) => typeof entry === 'string');

/**
 * Runs a suite's `scoutHook` (a bash script) with the evals config JSON on stdin and returns the
 * env it prints as `{ "env"?: {...} }`, to start Scout and Playwright with.
 */
export const runScoutHook = (
  repoRoot: string,
  hookPath: string,
  config: unknown
): Record<string, string> => {
  const result = spawnSync('bash', [Path.resolve(repoRoot, hookPath)], {
    cwd: repoRoot,
    input: JSON.stringify(config ?? {}),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
    timeout: HOOK_TIMEOUT_MS,
  });

  if (result.error) {
    throw new Error(`scoutHook ${hookPath} failed to run: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `scoutHook ${hookPath} exited with code ${result.status}; see its output above`
    );
  }

  let output: unknown;
  try {
    output = JSON.parse(result.stdout || '{}');
  } catch {
    throw new Error(`scoutHook ${hookPath} did not print JSON`);
  }

  const { env = {} } = (output ?? {}) as Record<string, unknown>;
  if (!isStringRecord(env)) {
    throw new Error(`scoutHook ${hookPath} must print { "env"?: Record<string, string> }`);
  }

  return env;
};
