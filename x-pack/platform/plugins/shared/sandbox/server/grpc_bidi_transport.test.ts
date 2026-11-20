/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as grpc from '@grpc/grpc-js';
import { loggerMock } from '@kbn/logging-mocks';
import { MAX_CALLBACK_RESULT_BYTES, SandboxApiClient } from './grpc_client';
import { SandboxRpcError } from './rpc';

jest.mock('@grpc/grpc-js', () => {
  const actual = jest.requireActual('@grpc/grpc-js');
  return {
    ...actual,
    credentials: { ...actual.credentials, createSsl: () => actual.credentials.createInsecure() },
  };
});

const CONVERSATION_ID = 'space__conv-1';
const identity = (buffer: Buffer): Buffer => buffer;

// Minimal protobuf helpers for the fake server; field values are strings or nested messages.
const varint = (value: number): Buffer => {
  const bytes: number[] = [];
  let v = value;
  while (v > 0x7f) {
    bytes.push((v % 0x80) + 0x80);
    v = Math.floor(v / 0x80);
  }
  bytes.push(v);
  return Buffer.from(bytes);
};
const field = (number: number, value: string | Buffer): Buffer => {
  const payload = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  return Buffer.concat([varint(number * 8 + 2), varint(payload.length), payload]);
};

/** Decodes the length-delimited and varint fields of one message level. */
const decode = (buf: Buffer): Map<number, Buffer | number> => {
  const fields = new Map<number, Buffer | number>();
  let offset = 0;
  const readVarint = () => {
    let result = 0;
    let multiplier = 1;
    while (true) {
      const byte = buf[offset++];
      result += (byte % 0x80) * multiplier;
      if (byte < 0x80) return result;
      multiplier *= 0x80;
    }
  };
  while (offset < buf.length) {
    const tag = readVarint();
    const wireType = tag % 8;
    const number = Math.floor(tag / 8);
    if (wireType === 0) fields.set(number, readVarint());
    else {
      const len = readVarint();
      fields.set(number, buf.subarray(offset, offset + len));
      offset += len;
    }
  }
  return fields;
};
const nested = (fields: Map<number, Buffer | number>, number: number) =>
  decode(fields.get(number) as Buffer);

const toolCallback = (requestId: string, toolId: string, params: string): Buffer =>
  field(1, Buffer.concat([field(1, requestId), field(2, field(1, toolId)), field(4, params)]));
const result = (stdout: string): Buffer => field(2, field(1, stdout));

type BidiHandler = (call: grpc.ServerDuplexStream<Buffer, Buffer>) => void;

describe('SandboxApiClient.runCommandWithCallbacks over a real grpc-js channel', () => {
  let server: grpc.Server;
  let client: SandboxApiClient;
  let handler: BidiHandler;

  beforeAll(async () => {
    server = new grpc.Server();
    server.addService(
      {
        runCommandBidi: {
          path: '/sandbox.SandboxService/RunCommandBidi',
          requestStream: true,
          responseStream: true,
          requestSerialize: identity,
          requestDeserialize: identity,
          responseSerialize: identity,
          responseDeserialize: identity,
        },
      },
      { runCommandBidi: (call: grpc.ServerDuplexStream<Buffer, Buffer>) => handler(call) }
    );
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (err, bound) =>
        err ? reject(err) : resolve(bound)
      );
    });
    client = new SandboxApiClient({
      host: '127.0.0.1',
      port,
      apiKey: 'secret-key',
      logger: loggerMock.create(),
    });
  });

  afterAll(() => {
    client.close();
    server.forceShutdown();
  });

  /** A fake pod that asks one callback and returns its decoded response. */
  const askOneCallback = (callback: Buffer) => {
    const seen: { command?: string; response?: Map<number, Buffer | number> } = {};
    handler = (call) => {
      call.on('data', (message: Buffer) => {
        const fields = decode(message);
        if (fields.has(1)) {
          seen.command = (nested(fields, 1).get(1) as Buffer).toString('utf8');
          call.write(callback);
        } else {
          seen.response = nested(fields, 2);
          call.write(result('done'));
          call.end();
        }
      });
    };
    return seen;
  };

  it('answers a tool callback and resolves with the command result', async () => {
    const seen = askOneCallback(
      toolCallback('7', 'platform.core.execute_esql', '{"query":"FROM logs"}')
    );
    const onCallback = jest.fn().mockResolvedValue({ ok: true, result: { rows: 3 } });

    const { value, rpc } = await client.runCommandWithCallbacks(
      CONVERSATION_ID,
      { command: 'kbn-tool esql "FROM logs"' },
      onCallback
    );

    expect(value.stdout).toBe('done');
    expect(rpc).toMatchObject({
      method: 'sandbox.SandboxService/RunCommandBidi',
      statusCode: 'OK',
    });
    expect(seen.command).toBe('kbn-tool esql "FROM logs"');
    expect(onCallback).toHaveBeenCalledWith({
      target: { type: 'tool', toolId: 'platform.core.execute_esql' },
      params: { query: 'FROM logs' },
    });
    expect((seen.response?.get(1) as Buffer).toString()).toBe('7');
    expect(seen.response?.get(2)).toBe(1);
    expect((seen.response?.get(3) as Buffer).toString()).toBe('{"rows":3}');
  });

  it('turns a failing callback handler into an error response', async () => {
    const seen = askOneCallback(toolCallback('1', 'some.tool', '{}'));

    await client.runCommandWithCallbacks(CONVERSATION_ID, { command: 'x' }, async () => {
      throw new Error('tool exploded');
    });

    expect(seen.response?.has(2)).toBe(false);
    expect((seen.response?.get(4) as Buffer).toString()).toBe('tool exploded');
  });

  it('refuses a result too large for a gRPC message', async () => {
    const seen = askOneCallback(toolCallback('1', 'some.tool', '{}'));

    await client.runCommandWithCallbacks(CONVERSATION_ID, { command: 'x' }, async () => ({
      ok: true,
      result: 'a'.repeat(MAX_CALLBACK_RESULT_BYTES + 1),
    }));

    expect((seen.response?.get(4) as Buffer).toString()).toContain('Ask for fewer rows or fields');
  });

  it('rejects when the stream ends without a result', async () => {
    handler = (call) => call.end();

    const error = await client
      .runCommandWithCallbacks(CONVERSATION_ID, { command: 'x' }, jest.fn())
      .catch((err) => err);

    expect(error).toBeInstanceOf(SandboxRpcError);
    expect(error).toMatchObject({ code: grpc.status.INTERNAL, rpc: { statusCode: 'INTERNAL' } });
  });
});
