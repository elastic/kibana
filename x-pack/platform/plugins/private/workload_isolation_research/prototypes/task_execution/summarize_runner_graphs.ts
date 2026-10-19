/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface FloorResult {
  run_id: string;
  status: string;
  before: { rss: number };
  after: { rss: number };
  load_time_comparable: boolean;
  resident: Array<{ family: string; resident: { heap_used: number } }>;
  rows: Array<{
    family: string;
    load_ms: number;
    modules: string[];
    clone_failure: string;
    constructor_failure: string;
  }>;
}
const evidence = process.argv[2];
assert.ok(evidence);
const derived = (['pool', 'capsule'] as const).flatMap((shape) => {
  const resultPath = join(evidence, `t1-runner-code-floor-${shape}-001_result.json`);
  const result = JSON.parse(readFileSync(resultPath, 'utf8')) as FloorResult;
  assert.equal(result.status, 'complete');
  const common = {
    run_id: result.run_id,
    evidence: resultPath,
    scope:
      'source-dev real runner CODE GRAPH FLOOR, excludes initialized services/data/execution; not an A/C adoption score',
    shape,
    resident_graphs: result.resident.length,
    mix:
      shape === 'pool'
        ? '1/1/1 class slots (capacity3, queues6/3/1)'
        : '6/3/1 capsule slots (capacity10)',
    load_time_comparable: result.load_time_comparable,
    actual_runners_executed: 0,
  };
  return [
    { ...common, metric: 'whole_process_rss_bytes', value: result.after.rss },
    {
      ...common,
      metric: 'summed_post_gc_isolate_heap_bytes',
      value: result.resident.reduce((sum, row) => sum + row.resident.heap_used, 0),
    },
    ...['alerting', 'workflow', 'agent'].map((family) => {
      const members = result.resident.filter((row) => row.family === family);
      assert.ok(members.length);
      return {
        ...common,
        metric: 'family_post_gc_heap_mean_bytes',
        family,
        count: members.length,
        value: members.reduce((sum, row) => sum + row.resident.heap_used, 0) / members.length,
        modules: result.rows.find((row) => row.family === family)?.modules,
      };
    }),
  ];
});
writeFileSync(
  join(evidence, 'runner_code_floor_reuse.jsonl'),
  derived.map((row) => JSON.stringify(row)).join('\n') + '\n'
);
process.stdout.write(JSON.stringify(derived, null, 2) + '\n');
