/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaCall } from './context';
import { runUntilDone, sourcesReadBy } from './workflow_runner';

/** A Kibana that runs each workflow run to the next of `outputs`, as completed unless it fails. */
const fakeKibana = (runs: Array<{ status?: string; output?: Record<string, unknown> }>) => {
  const started: Array<Record<string, unknown>> = [];
  const call = jest.fn(async (method: string, path: string, body?: unknown) => {
    if (path.endsWith('/executions?size=10')) {
      return { status: 200, data: { results: [{ id: 'old', status: 'completed' }] } };
    }
    if (method === 'POST' && path.endsWith('/run')) {
      started.push((body as { inputs: Record<string, unknown> }).inputs);
      return { status: 200, data: { workflowExecutionId: `exec-${started.length}` } };
    }
    const run = runs[Number(path.split('exec-')[1]) - 1];
    return {
      status: 200,
      data: {
        id: path,
        status: run.status ?? 'completed',
        duration: 1000,
        context: { output: run.output },
      },
    };
  });
  return { kibana: call as unknown as KibanaCall, started };
};

const run = (kibana: KibanaCall, since?: string) =>
  runUntilDone({
    kibana,
    workflowId: 'system-context-engine-trace-dreaming-eval-0123',
    since,
    maxRuns: 5,
    retries: 1,
    timeoutMs: 10_000,
    pollIntervalMs: 1,
    onRun: () => {},
  });

describe('runUntilDone', () => {
  it('reads from the given time first, then from where each run stopped, until a run reads nothing', async () => {
    const { kibana, started } = fakeKibana([
      { output: { rounds: 50, created: 12 } },
      { output: { rounds: 41, created: 9 } },
      { output: { rounds: 0 } },
    ]);

    const runs = await run(kibana, '2023-01-01T00:00:00.000Z');

    expect(started).toEqual([{ since: '2023-01-01T00:00:00.000Z' }, {}, {}]);
    expect(runs.map(({ executionId, status }) => [executionId, status])).toEqual([
      ['exec-1', 'completed'],
      ['exec-2', 'completed'],
      ['exec-3', 'completed'],
    ]);
  });

  it('runs a failed run again, from the given time until one completes', async () => {
    const { kibana, started } = fakeKibana([
      { status: 'failed' },
      { output: { rounds: 50 } },
      { status: 'failed' },
      { output: { rounds: 0 } },
    ]);

    const runs = await run(kibana, '2023-01-01T00:00:00.000Z');

    expect(started).toEqual([
      { since: '2023-01-01T00:00:00.000Z' },
      { since: '2023-01-01T00:00:00.000Z' },
      {},
      {},
    ]);
    expect(runs.map(({ status }) => status)).toEqual([
      'failed',
      'completed',
      'failed',
      'completed',
    ]);
  });

  it('stops after `retries` failed runs in a row', async () => {
    const { kibana, started } = fakeKibana([
      { output: { rounds: 50 } },
      { status: 'failed' },
      { status: 'timed_out' },
      { status: 'failed' },
      { output: { rounds: 50 } },
    ]);

    const runs = await run(kibana);

    expect(started).toHaveLength(3);
    expect(runs.map(({ status }) => status)).toEqual(['completed', 'failed', 'timed_out']);
  });

  it('counts what a dreaming run read, whichever source it dreams on', () => {
    expect(sourcesReadBy({ rounds: 3 })).toBe(3);
    expect(sourcesReadBy({ memories: '4' })).toBe(4);
    expect(sourcesReadBy({ excerpts: 5 })).toBe(5);
    expect(sourcesReadBy({ reason: 'paused' })).toBe(0);
    expect(sourcesReadBy(undefined)).toBe(0);
  });
});
