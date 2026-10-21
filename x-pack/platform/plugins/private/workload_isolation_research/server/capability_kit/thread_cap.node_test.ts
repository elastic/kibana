/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { join } from 'node:path';

const Mib = 1024 * 1024;

void test('a thread cap binds under the parent old-space flag and the parent limit stays', () => {
  const child = spawnSync(process.execPath, [join(__dirname, 'thread_cap_run.cts')], {
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=1638',
      T7P_THREAD_CAP_PROBE: '1',
    },
    timeout: 60000,
  });
  assert.equal(child.status, 0, child.stderr);
  const line = child.stdout.trim().split('\n').at(-1);
  const parsed: unknown = JSON.parse(line ?? '');
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('mainBefore' in parsed) ||
    !('mainAfter' in parsed) ||
    !('cappedLimit' in parsed) ||
    !('plainLimit' in parsed)
  ) {
    throw new Error('probe output missing heap limits');
  }
  const mainBefore = parsed.mainBefore;
  const mainAfter = parsed.mainAfter;
  const cappedLimit = parsed.cappedLimit;
  const plainLimit = parsed.plainLimit;
  if (
    typeof mainBefore !== 'number' ||
    typeof mainAfter !== 'number' ||
    typeof cappedLimit !== 'number' ||
    typeof plainLimit !== 'number'
  ) {
    throw new Error('probe heap limits were not numbers');
  }
  assert.equal(mainBefore, mainAfter);
  assert.ok(mainBefore > 1500 * Mib);
  assert.ok(cappedLimit > 384 * Mib);
  assert.ok(cappedLimit < 800 * Mib);
  assert.ok(plainLimit > 1500 * Mib);
});
