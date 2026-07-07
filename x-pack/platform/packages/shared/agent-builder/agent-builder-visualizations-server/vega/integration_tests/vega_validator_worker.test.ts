/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
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

  // The spec is authored by an LLM from user prompts, so a prompt-injection path
  // could steer it into leaving an external `url` in the spec. Normalization only
  // swaps the top-level data source, so a `lookup` transform's `from.data.url`
  // survives; the headless render must not fetch it (blind SSRF / local-file
  // read from the Kibana server). Validation still passes: a blocked load is a
  // Vega warning, not a spec rejection, and the dataset is simply left empty.
  it('does not fetch an external lookup.from.data.url during validation', async () => {
    const server: Server = createServer((_req, res) => res.end('[]'));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const requested: string[] = [];
    server.on('request', (req) => requested.push(req.url ?? ''));

    try {
      const { port } = server.address() as AddressInfo;
      const result = await validate({
        transform: [
          {
            lookup: 'status',
            from: {
              data: { url: `http://127.0.0.1:${port}/ssrf-via-lookup` },
              key: 'status',
              fields: ['label'],
            },
          },
        ],
        mark: 'bar',
        encoding: {
          x: { field: 'status', type: 'nominal' },
          y: { field: 'count', type: 'quantitative' },
        },
      });

      expect(result.ok).toBe(true);
      expect(requested).toEqual([]);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
