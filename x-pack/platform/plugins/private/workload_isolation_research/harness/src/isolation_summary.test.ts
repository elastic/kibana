/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { PodRow } from './score';
import { scoreRun } from './score';
import { summarizeIsolationRuns } from './isolation_summary';

jest.mock('./score', () => ({ scoreRun: jest.fn() }));
const pod: PodRow = {
  kind: 'pod',
  run_id: 'test-run',
  phase: 'dose',
  pod: 'pod',
  boot_id: 'boot',
  role: 'combined',
  window_start: 1,
  window_end: 2,
  valid: true,
  invalid_reasons: [],
  metrics: { probe_p95_ms: 12 },
  vs_baseline: { probe_p95: 1.2 },
  drills: {},
  drill_counts: {},
  notes: [],
};
let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wir-summary-'));
  fs.writeFileSync(
    path.join(dir, 'manifest.json'),
    JSON.stringify({
      run_id: 'test-run',
      target: { kind: 'local' },
      workload_params: { name: 'curve' },
    })
  );
  fs.writeFileSync(
    path.join(dir, 'samples.ndjson'),
    JSON.stringify({ source: 'proc', ts: 1 }) + '\n'
  );
});
afterEach(() => fs.rmSync(dir, { recursive: true }));
it('does not cherry-pick a valid pod row from a run-level INVALID experiment', () => {
  jest.mocked(scoreRun).mockReturnValue({
    pods: [pod],
    cluster: [],
    run_valid: false,
    run_invalid_reasons: ['missing background source'],
  });
  expect(summarizeIsolationRuns([dir])).toEqual([
    expect.objectContaining({
      run_valid: false,
      rows: [],
      invalid_reasons: ['missing background source'],
    }),
  ]);
  expect(scoreRun).toHaveBeenCalledWith(expect.objectContaining({ run_id: 'test-run' }), [
    { source: 'proc', ts: 1 },
  ]);
});
it('emits metrics only when recomputed whole-run validity passes', () => {
  jest
    .mocked(scoreRun)
    .mockReturnValue({ pods: [pod], cluster: [], run_valid: true, run_invalid_reasons: [] });
  expect(summarizeIsolationRuns([dir])).toEqual([
    expect.objectContaining({
      run_valid: true,
      rows: [expect.objectContaining({ probe_p95_ms: 12, probe_p95_ratio: 1.2 })],
    }),
  ]);
});
