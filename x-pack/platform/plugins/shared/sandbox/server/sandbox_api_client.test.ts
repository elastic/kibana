/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'events';
import { Metadata, status } from '@grpc/grpc-js';
import { loggerMock } from '@kbn/logging-mocks';
import type { Logger } from '@kbn/core/server';
import { SandboxApiClient } from './grpc_client';
import { SandboxRpcError } from './rpc';

const mockRpc = jest.fn();

jest.mock('@grpc/grpc-js', () => {
  const actual = jest.requireActual('@grpc/grpc-js');

  function MockSandboxServiceClient(this: Record<string, unknown>): void {
    this.close = jest.fn();
    ['runCommand', 'statFiles', 'readFiles', 'writeFiles', 'mkdirs'].forEach((method) => {
      this[method] = (...args: unknown[]) => mockRpc(method, ...args);
    });
  }

  return {
    ...actual,
    makeClientConstructor: () => MockSandboxServiceClient,
    credentials: { createSsl: () => ({}) },
  };
});

const CONVERSATION_ID = 'space__conv-1';
const REQUEST_ID_HEADER = 'x-cloud-request-id';

const metadataWith = (key: string, ...values: string[]): Metadata => {
  const metadata = new Metadata();
  values.forEach((value) => metadata.add(key, value));
  return metadata;
};

/**
 * Metadata holding a value as it is, for values that `Metadata.add` refuses. grpc-js does not
 * let a header with a control character through, so a response cannot carry one today.
 */
const unvalidatedMetadata = (value: string): Metadata =>
  ({ get: () => [value] } as unknown as Metadata);

/**
 * Plays a response back the way grpc-js does for a unary call: initial metadata, then the callback
 * with the result or the error, then the `status` event with the trailers. `emitStatus: false`
 * leaves out the `status` event and `emitCallback: false` the callback, for the cases where one of
 * them never arrives.
 */
const reply = ({
  initialMetadata,
  trailers = new Metadata(),
  code = status.OK,
  response,
  emitCallback = true,
  emitStatus = true,
}: {
  initialMetadata?: Metadata;
  trailers?: Metadata;
  code?: status;
  response?: unknown;
  emitCallback?: boolean;
  emitStatus?: boolean;
}) => {
  mockRpc.mockImplementation(
    (_method, _request, _metadata, _options, callback: (...args: unknown[]) => void) => {
      const call = new EventEmitter();
      setImmediate(() => {
        if (initialMetadata) call.emit('metadata', initialMetadata);
        if (emitCallback) {
          if (code === status.OK) {
            callback(null, response);
          } else {
            callback(
              Object.assign(new Error(`${code} ${status[code]}`), {
                code,
                details: 'boom',
                metadata: trailers,
              })
            );
          }
        }
        if (emitStatus) call.emit('status', { code, details: 'boom', metadata: trailers });
      });
      return call;
    }
  );
};

interface RpcLogMeta {
  http?: { request: { id: string } };
  sandbox: { conversation_id: string };
  rpc: { method: string };
}

describe('SandboxApiClient', () => {
  let logger: jest.Mocked<Logger>;
  let client: SandboxApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    client = new SandboxApiClient({
      host: 'sandbox-api',
      port: 50051,
      apiKey: 'secret-key',
      logger,
    });
  });

  const debugMeta = () => logger.debug.mock.calls[0][1] as RpcLogMeta;

  it('sends the api key and the conversation id as request metadata', async () => {
    reply({ response: [] });

    await client.statFiles(CONVERSATION_ID, ['/a']);

    const [, , metadata] = mockRpc.mock.calls[0];
    expect(metadata.get('authorization')).toEqual(['ApiKey secret-key']);
    expect(metadata.get('x-conversation-id')).toEqual([CONVERSATION_ID]);
  });

  describe('result', () => {
    it('resolves with the value and what the call reports about itself', async () => {
      reply({ initialMetadata: metadataWith(REQUEST_ID_HEADER, 'req-1'), response: [] });

      const result = await client.statFiles(CONVERSATION_ID, ['/a']);

      expect(result).toEqual({
        value: [],
        rpc: {
          requestId: 'req-1',
          conversationId: CONVERSATION_ID,
          method: 'sandbox.SandboxService/StatFiles',
          statusCode: 'OK',
          durationNs: expect.any(Number),
        },
      });
      expect(result.rpc.durationNs).toBeGreaterThan(0);
    });

    it('rejects with a SandboxRpcError that keeps the gRPC code and carries the same fields', async () => {
      reply({
        initialMetadata: metadataWith(REQUEST_ID_HEADER, 'req-2'),
        code: status.UNAVAILABLE,
      });

      const error = await client.mkdirs(CONVERSATION_ID, ['/a']).catch((err) => err);

      expect(error).toBeInstanceOf(SandboxRpcError);
      expect(error).toMatchObject({
        code: status.UNAVAILABLE,
        details: 'boom',
        rpc: {
          requestId: 'req-2',
          conversationId: CONVERSATION_ID,
          method: 'sandbox.SandboxService/Mkdirs',
          statusCode: 'UNAVAILABLE',
        },
      });
      expect(error.message).toContain('UNAVAILABLE');
      expect(error.cause).toMatchObject({ code: status.UNAVAILABLE });
    });

    it.each([
      ['a deadline timeout', status.DEADLINE_EXCEEDED, 'DEADLINE_EXCEEDED'],
      ['an unreachable server', status.UNAVAILABLE, 'UNAVAILABLE'],
    ])('reports the status name, and no request id, when %s', async (_label, code, name) => {
      reply({ code });

      const error = await client.statFiles(CONVERSATION_ID, ['/a']).catch((err) => err);

      expect(error).toMatchObject({ code, rpc: { statusCode: name } });
      expect(error.rpc).not.toHaveProperty('requestId', expect.any(String));
    });

    it('does not hang when the status event never arrives', async () => {
      reply({ response: [true], emitStatus: false });

      await expect(client.mkdirs(CONVERSATION_ID, ['/a'])).resolves.toMatchObject({
        value: [true],
        rpc: { statusCode: 'OK' },
      });
    });

    it('rejects when the status arrives without a result', async () => {
      reply({ code: status.INTERNAL, emitCallback: false });

      await expect(client.mkdirs(CONVERSATION_ID, ['/a'])).rejects.toMatchObject({
        code: status.INTERNAL,
        rpc: { statusCode: 'INTERNAL' },
      });
    });
  });

  describe('request id', () => {
    it('reads the id from the initial metadata', async () => {
      reply({ initialMetadata: metadataWith(REQUEST_ID_HEADER, 'req-1'), response: [] });

      const { rpc } = await client.statFiles(CONVERSATION_ID, ['/a']);

      expect(rpc.requestId).toBe('req-1');
    });

    it('falls back to the trailers when the response has no initial metadata', async () => {
      reply({ trailers: metadataWith(REQUEST_ID_HEADER, 'req-3'), code: status.INTERNAL });

      const error = await client.readFiles(CONVERSATION_ID, [{ path: '/a' }]).catch((err) => err);

      expect(error.rpc.requestId).toBe('req-3');
    });

    it('takes the last id when the proxy appended its own to a client-supplied one', async () => {
      reply({
        initialMetadata: metadataWith(REQUEST_ID_HEADER, 'client-supplied, proxy-assigned'),
        response: [],
      });

      const { rpc } = await client.statFiles(CONVERSATION_ID, ['/a']);

      expect(rpc.requestId).toBe('proxy-assigned');
    });

    it('caps the length', async () => {
      reply({ initialMetadata: metadataWith(REQUEST_ID_HEADER, 'a'.repeat(500)), response: [] });

      const { rpc } = await client.statFiles(CONVERSATION_ID, ['/a']);

      expect(rpc.requestId).toHaveLength(128);
    });

    it('trims surrounding whitespace, so a trailing line break does not reach a log', async () => {
      reply({ initialMetadata: unvalidatedMetadata('req-1\n'), response: [] });

      const { rpc } = await client.statFiles(CONVERSATION_ID, ['/a']);

      expect(rpc.requestId).toBe('req-1');
    });

    it.each([
      ['a line break inside', 'req-\n1'],
      ['a control character', 'req-\u0007'],
    ])('drops an id with %s, so it cannot carry one into a log', async (_label, value) => {
      reply({ initialMetadata: unvalidatedMetadata(value), response: [] });

      const { rpc } = await client.statFiles(CONVERSATION_ID, ['/a']);

      expect(rpc.requestId).toBeUndefined();
    });
  });

  describe('per-RPC debug log', () => {
    it('logs the call with the fields of the contract', async () => {
      reply({ initialMetadata: metadataWith(REQUEST_ID_HEADER, 'req-1'), response: [] });

      await client.statFiles(CONVERSATION_ID, ['/a']);

      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        'Sandbox RPC sandbox.SandboxService/StatFiles finished with gRPC status OK',
        {
          http: { request: { id: 'req-1' } },
          sandbox: { conversation_id: CONVERSATION_ID },
          rpc: {
            system: { name: 'grpc' },
            method: 'sandbox.SandboxService/StatFiles',
            response: { status_code: 'OK' },
          },
          event: { duration: expect.any(Number) },
        }
      );
    });

    it('logs a failed call once, with its status name', async () => {
      reply({
        initialMetadata: metadataWith(REQUEST_ID_HEADER, 'req-2'),
        code: status.UNAVAILABLE,
      });

      await expect(client.mkdirs(CONVERSATION_ID, ['/a'])).rejects.toBeDefined();

      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        'Sandbox RPC sandbox.SandboxService/Mkdirs finished with gRPC status UNAVAILABLE',
        expect.objectContaining({
          http: { request: { id: 'req-2' } },
          rpc: expect.objectContaining({ response: { status_code: 'UNAVAILABLE' } }),
        })
      );
    });

    it('omits http.request.id when the response carries none', async () => {
      reply({ response: [true] });

      await client.mkdirs(CONVERSATION_ID, ['/a']);

      expect(debugMeta()).not.toHaveProperty('http');
      expect(debugMeta().sandbox).toEqual({ conversation_id: CONVERSATION_ID });
    });

    it('logs once when the status event is missing as well', async () => {
      reply({ response: [true], emitStatus: false });

      await client.mkdirs(CONVERSATION_ID, ['/a']);

      expect(logger.debug).toHaveBeenCalledTimes(1);
    });
  });

  it.each([
    ['runCommand', 'RunCommand', () => client.runCommand(CONVERSATION_ID, { command: 'true' })],
    ['statFiles', 'StatFiles', () => client.statFiles(CONVERSATION_ID, ['/a'])],
    ['readFiles', 'ReadFiles', () => client.readFiles(CONVERSATION_ID, [{ path: '/a' }])],
    [
      'writeFiles',
      'WriteFiles',
      () => client.writeFiles(CONVERSATION_ID, [{ path: '/a', content: Buffer.from('') }]),
    ],
    ['mkdirs', 'Mkdirs', () => client.mkdirs(CONVERSATION_ID, ['/a'])],
  ])('reports %s as a call to the %s method', async (property, rpcName, call) => {
    reply({ initialMetadata: metadataWith(REQUEST_ID_HEADER, 'req-4'), response: [] });

    const { rpc } = await call();

    expect(mockRpc.mock.calls[0][0]).toBe(property);
    expect(rpc.method).toBe(`sandbox.SandboxService/${rpcName}`);
    expect(rpc.requestId).toBe('req-4');
  });
});
