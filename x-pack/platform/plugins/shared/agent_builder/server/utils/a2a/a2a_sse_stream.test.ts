/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JSONRPCResponse } from '@a2a-js/sdk';
import { asyncGeneratorToA2ASSE } from './a2a_sse_stream';

const collect = (
  stream: NodeJS.ReadableStream,
  { until }: { until?: () => boolean } = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let out = '';
    stream.on('data', (chunk: Buffer | string) => {
      out += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      if (until?.()) resolve(out);
    });
    stream.on('end', () => resolve(out));
    stream.on('error', reject);
  });
};

const buildResponse = (id: number, result: object): JSONRPCResponse =>
  ({ jsonrpc: '2.0', id, result } as unknown as JSONRPCResponse);

const buildLogger = () => ({ debug: jest.fn(), error: jest.fn() });

describe('asyncGeneratorToA2ASSE', () => {
  const runGenerator = async function* (events: JSONRPCResponse[]) {
    for (const e of events) yield e;
  };

  it('emits each yielded JSON-RPC response as an A2A SSE frame (id + data, no event)', async () => {
    const events = [buildResponse(1, { kind: 'status' }), buildResponse(1, { kind: 'artifact' })];

    const controller = new AbortController();
    const output = asyncGeneratorToA2ASSE(runGenerator(events), {
      logger: buildLogger(),
      signal: controller.signal,
      requestId: 1,
    });

    const body = await collect(output);
    const frames = body.split(/\n\n/).filter(Boolean);

    expect(frames).toHaveLength(2);
    for (let i = 0; i < 2; i++) {
      expect(frames[i]).toMatch(/^id: \d+\ndata: /);
      expect(frames[i]).not.toContain('event:');
      const dataLine = frames[i].split('\n').find((l) => l.startsWith('data: '))!;
      expect(JSON.parse(dataLine.slice('data: '.length))).toEqual(events[i]);
    }
  });

  it('ends the stream after the generator finishes', async () => {
    const controller = new AbortController();
    const output = asyncGeneratorToA2ASSE(runGenerator([buildResponse(1, { ok: true })]), {
      logger: buildLogger(),
      signal: controller.signal,
    });

    await collect(output);
    expect(output.writableEnded).toBe(true);
  });

  it('emits a terminal error frame when the generator throws', async () => {
    const boom = async function* (): AsyncGenerator<JSONRPCResponse, void, undefined> {
      yield buildResponse(1, { ok: true });
      throw new Error('kaboom');
    };
    const controller = new AbortController();
    const logger = buildLogger();
    const output = asyncGeneratorToA2ASSE(boom(), {
      logger,
      signal: controller.signal,
      requestId: 7,
    });

    const body = await collect(output);
    const frames = body.split(/\n\n/).filter(Boolean);

    expect(frames).toHaveLength(2);
    expect(frames[1]).toContain('event: error');
    const dataLine = frames[1].split('\n').find((l) => l.startsWith('data: '))!;
    const parsed = JSON.parse(dataLine.slice('data: '.length));
    expect(parsed).toMatchObject({ jsonrpc: '2.0', id: 7, error: expect.objectContaining({}) });
    expect(logger.error).toHaveBeenCalled();
  });

  it('adds a cloud-proxy padding comment when isCloudEnabled and the frame is small', async () => {
    const events = [buildResponse(1, { tiny: 1 })];
    const controller = new AbortController();
    const output = asyncGeneratorToA2ASSE(runGenerator(events), {
      logger: buildLogger(),
      signal: controller.signal,
      isCloudEnabled: true,
    });

    const body = await collect(output);
    expect(body).toMatch(/^id: \d+\ndata: /);
    // A comment line begins with `:` and is used to force proxy flush.
    expect(body).toMatch(/\n: 0{100,}/);
  });

  it('pads only once per throttle window when multiple small frames arrive in a burst', async () => {
    const events = [
      buildResponse(1, { a: 1 }),
      buildResponse(1, { b: 2 }),
      buildResponse(1, { c: 3 }),
    ];
    const controller = new AbortController();
    const output = asyncGeneratorToA2ASSE(runGenerator(events), {
      logger: buildLogger(),
      signal: controller.signal,
      isCloudEnabled: true,
    });

    const body = await collect(output);
    // The generator yields synchronously; all frames are written within the
    // same millisecond, so the throttled padding should fire exactly once.
    const padMatches = body.match(/\n: 0{100,}\n\n/g) ?? [];
    expect(padMatches).toHaveLength(1);
  });

  it('does NOT pad frames when isCloudEnabled is false', async () => {
    const events = [buildResponse(1, { tiny: 1 })];
    const controller = new AbortController();
    const output = asyncGeneratorToA2ASSE(runGenerator(events), {
      logger: buildLogger(),
      signal: controller.signal,
      isCloudEnabled: false,
    });

    const body = await collect(output);
    expect(body).not.toMatch(/\n: 0{100,}/);
  });

  it('ends the stream immediately when the signal is already aborted at entry, without consuming the source', async () => {
    const gen = jest.fn(async function* (): AsyncGenerator<JSONRPCResponse, void, undefined> {
      yield buildResponse(1, { shouldNotBeSeen: true });
    });
    const controller = new AbortController();
    controller.abort();

    const output = asyncGeneratorToA2ASSE(gen(), {
      logger: buildLogger(),
      signal: controller.signal,
    });

    const body = await collect(output);
    expect(body).toBe('');
    expect(output.writableEnded).toBe(true);
  });

  it('ends the stream when the abort signal fires mid-generation', async () => {
    let released!: () => void;
    const gate = new Promise<void>((resolve) => {
      released = resolve;
    });

    const gen = async function* (): AsyncGenerator<JSONRPCResponse, void, undefined> {
      yield buildResponse(1, { first: true });
      await gate; // wait until we abort
      yield buildResponse(1, { second: true }); // should not be written
    };

    const controller = new AbortController();
    const output = asyncGeneratorToA2ASSE(gen(), {
      logger: buildLogger(),
      signal: controller.signal,
    });

    // wait for the first frame, then abort
    await collect(output, { until: () => true }).then(() => {
      controller.abort();
      released();
    });

    // Give the microtask queue a chance to complete the abort teardown.
    await new Promise((r) => setImmediate(r));
    expect(output.writableEnded).toBe(true);
  });
});
