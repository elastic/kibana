/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  requestRunner,
  startHardenedRunner,
  stopHardenedRunner,
  type RunnerResponse,
} from './vega_validator_test_utils';

interface WorkerResponse extends RunnerResponse {
  ok: boolean;
}

const WORKER_PATH = require.resolve('../vega_validator_wrapper.cjs');

const withEsqlData = (spec: Record<string, unknown>) => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  data: { url: { '%type%': 'esql', query: 'FROM logs-*' } },
  ...spec,
});

describe('vega validator worker', () => {
  let hardenedRunner: ReturnType<typeof startHardenedRunner>;

  beforeAll(() => {
    hardenedRunner = startHardenedRunner({ workerPath: WORKER_PATH });
  });

  afterAll(async () => {
    await stopHardenedRunner(hardenedRunner);
  });

  const validate = (spec: Record<string, unknown>): Promise<WorkerResponse> =>
    requestRunner<WorkerResponse>(hardenedRunner, { spec: withEsqlData(spec) });

  it('inherits the string-code-generation restriction in nested workers', async () => {
    const result = await requestRunner(hardenedRunner, { type: 'probe-code-generation' });

    expect(result.codeGenerationBlocked).toBe(true);
  });

  it('compiles and renders a valid spec when string code generation is disabled', async () => {
    const result = await validate({
      mark: 'bar',
      encoding: {
        x: { field: 'status', type: 'nominal' },
        y: { field: 'count', type: 'quantitative' },
      },
    });

    expect(result.ok).toBe(true);
  });

  it('reports incompatible polar encoding channels as warnings', async () => {
    const result = await validate({
      mark: { type: 'line', point: true },
      encoding: {
        theta: { field: 'metric', type: 'nominal' },
        radius: { field: 'value', type: 'quantitative' },
      },
      projection: { type: 'polar' },
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'theta dropped as it is incompatible with "line".',
        'radius dropped as it is incompatible with "line".',
        'theta dropped as it is incompatible with "point".',
        'radius dropped as it is incompatible with "point".',
      ])
    );
  });

  it('evaluates spec expressions with the interpreter', async () => {
    const result = await validate({
      transform: [{ filter: 'datum.count > 0' }],
      mark: 'point',
      encoding: { x: { field: 'status', type: 'nominal' } },
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
    expect(result.error).toMatch(/Unexpected end of input/);
  });

  it('reports a compile-time encoding error', async () => {
    const result = await validate({
      mark: 'bar',
      encoding: { x: { field: 'status', type: 'not-a-real-type' } },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Invalid field type/);
  });

  it('does not fetch external lookup data during validation', async () => {
    const server: Server = createServer((_request, response) => response.end('[]'));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const requestedUrls: string[] = [];
    server.on('request', (request) => requestedUrls.push(request.url ?? ''));

    try {
      const { port } = server.address() as AddressInfo;
      const result = await validate({
        transform: [
          {
            lookup: 'status',
            from: {
              data: { url: `http://127.0.0.1:${port}/external-lookup` },
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
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('external loading disabled during validation'),
        ])
      );
      expect(requestedUrls).toEqual([]);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
