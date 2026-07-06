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
  id: string;
  ok: boolean;
  error?: string;
  warnings?: string[];
}

const WORKER_PATH = require.resolve('./vega_validator_wrapper.js');

const withEsqlData = (spec: Record<string, unknown>) => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  data: { url: { '%type%': 'esql', query: 'FROM logs-*' } },
  ...spec,
});

const SAMPLE_ROWS = [
  { status: 'ok', count: 10 },
  { status: 'err', count: 3 },
];

describe('vega_validator_worker', () => {
  let worker: Worker;
  const responses = new Map<string, (response: WorkerResponse) => void>();

  beforeAll(() => {
    worker = new Worker(WORKER_PATH);
    worker.on('message', (response: WorkerResponse) => responses.get(response.id)?.(response));
  });

  afterAll(async () => {
    await worker.terminate();
  });

  const validate = (id: string, spec: Record<string, unknown>): Promise<WorkerResponse> =>
    new Promise((resolve) => {
      responses.set(id, resolve);
      worker.postMessage({ id, spec: withEsqlData(spec), rows: SAMPLE_ROWS });
    });

  it('passes a valid Vega-Lite spec', async () => {
    const result = await validate('good', {
      mark: 'bar',
      encoding: {
        x: { field: 'status', type: 'nominal' },
        y: { field: 'count', type: 'quantitative' },
      },
    });

    expect(result.ok).toBe(true);
  });

  it('reports a render-time expression error', async () => {
    const result = await validate('bad-expression', {
      transform: [{ filter: 'datum.count >' }],
      mark: 'point',
      encoding: { x: { field: 'status', type: 'nominal' } },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('reports a compile-time encoding error', async () => {
    const result = await validate('bad-encoding', {
      mark: 'bar',
      encoding: { x: { field: 'status', type: 'not-a-real-type' } },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
