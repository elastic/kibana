/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { spawnSync } from 'child_process';
import { z } from '@kbn/zod/v4';

const HOOK_TIMEOUT_MS = 60_000;

// The whole output must be an object: `[]`, `5` or `"ok"` must not pass as "no env".
const scoutHookOutputSchema = z.strictObject({
  env: z.record(z.string(), z.string()).optional(),
});

/**
 * Runs a suite's `scoutHook` (a bash script) with the evals config JSON on stdin and returns the
 * env it prints as `{ "env"?: {...} }`, to start Scout and Playwright with.
 */
export const runScoutHook = (
  repoRoot: string,
  hookPath: string,
  config: object
): Record<string, string> => {
  const result = spawnSync('bash', [Path.resolve(repoRoot, hookPath)], {
    cwd: repoRoot,
    input: JSON.stringify(config),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
    timeout: HOOK_TIMEOUT_MS,
  });

  // EPIPE means the hook exited before Node wrote the config to its stdin, not that it failed.
  if (result.error && (result.error as NodeJS.ErrnoException).code !== 'EPIPE') {
    throw new Error(`scoutHook ${hookPath} failed to run: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `scoutHook ${hookPath} exited with code ${result.status}; see its output above`
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(result.stdout || '{}');
  } catch {
    throw new Error(`scoutHook ${hookPath} did not print JSON`);
  }
  const parsed = scoutHookOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`scoutHook ${hookPath} must print { "env"?: Record<string, string> }`);
  }

  return parsed.data.env ?? {};
};
