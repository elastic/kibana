/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Worker } from 'node:worker_threads';

/**
 * Exercises the real worker (ESM-only `vega`/`vega-lite` loaded inside a worker
 * thread, which Jest's CommonJS runtime cannot load in-process). Verifies a
 * valid spec passes and that both compile- and render-time problems surface as
 * errors.
 */
interface WorkerResponse {
  ok: boolean;
  error?: string;
  warnings?: string[];
}

const WORKER_PATH = require.resolve('../vega_validator_wrapper.js');

const withEsqlData = (spec: Record<string, unknown>) => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  data: { url: { '%type%': 'esql', query: 'FROM logs-*' } },
  ...spec,
});

describe('vega_validator_worker', () => {
  let worker: Worker;

  beforeAll(() => {
    worker = new Worker(WORKER_PATH);
  });

  afterAll(async () => {
    await worker.terminate();
  });

  // The worker answers one message per request; tests run sequentially, so
  // waiting for the next 'message' event pairs each response to its request.
  const validate = (spec: Record<string, unknown>): Promise<WorkerResponse> =>
    new Promise((resolve) => {
      worker.once('message', resolve);
      worker.postMessage({ spec: withEsqlData(spec) });
    });

  it('passes a valid Vega-Lite spec', async () => {
    const result = await validate({
      mark: 'bar',
      encoding: {
        x: { field: 'status', type: 'nominal' },
        y: { field: 'count', type: 'quantitative' },
      },
    });

    expect(result.ok).toBe(true);
  });

  it('reports a render-time expression error', async () => {
    const result = await validate({
      transform: [{ filter: 'datum.count >' }],
      mark: 'point',
      encoding: { x: { field: 'status', type: 'nominal' } },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('reports a compile-time encoding error', async () => {
    const result = await validate({
      mark: 'bar',
      encoding: { x: { field: 'status', type: 'not-a-real-type' } },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
