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
 * Plays a response back the way grpc-js does for a unary call: initial metadata, then the callback
 * with the result or the error, then the `status` event with the trailers.
 */
const reply = ({
  initialMetadata,
  trailers = new Metadata(),
  code = status.OK,
  response,
}: {
  initialMetadata?: Metadata;
  trailers?: Metadata;
  code?: status;
  response?: unknown;
}) => {
  mockRpc.mockImplementation(
    (_method, _request, _metadata, _options, callback: (...args: unknown[]) => void) => {
      const call = new EventEmitter();
      setImmediate(() => {
        if (initialMetadata) call.emit('metadata', initialMetadata);
        if (code === status.OK) {
          callback(null, response);
        } else {
          callback(
            Object.assign(new Error(`${code} ${status[code]}`), { code, metadata: trailers })
          );
        }
        call.emit('status', { code, details: '', metadata: trailers });
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

  describe('per-RPC debug log', () => {
    it('logs the proxy request id from the initial response metadata of a successful call', async () => {
      reply({ initialMetadata: metadataWith(REQUEST_ID_HEADER, 'req-1'), response: [] });

      await expect(client.statFiles(CONVERSATION_ID, ['/a'])).resolves.toEqual([]);

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

    it('logs the status name of a failed call and still rejects with the error', async () => {
      reply({
        initialMetadata: metadataWith(REQUEST_ID_HEADER, 'req-2'),
        code: status.UNAVAILABLE,
      });

      await expect(client.mkdirs(CONVERSATION_ID, ['/a'])).rejects.toMatchObject({
        code: status.UNAVAILABLE,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'Sandbox RPC sandbox.SandboxService/Mkdirs finished with gRPC status UNAVAILABLE',
        expect.objectContaining({
          http: { request: { id: 'req-2' } },
          rpc: expect.objectContaining({ response: { status_code: 'UNAVAILABLE' } }),
        })
      );
    });

    it('falls back to the trailers when the response has no initial metadata', async () => {
      reply({ trailers: metadataWith(REQUEST_ID_HEADER, 'req-3'), code: status.INTERNAL });

      await expect(client.readFiles(CONVERSATION_ID, [{ path: '/a' }])).rejects.toBeDefined();

      expect(debugMeta().http).toEqual({ request: { id: 'req-3' } });
    });

    it('omits http.request.id when the response carries none', async () => {
      reply({ response: [true] });

      await client.mkdirs(CONVERSATION_ID, ['/a']);

      expect(debugMeta()).not.toHaveProperty('http');
      expect(debugMeta().sandbox).toEqual({ conversation_id: CONVERSATION_ID });
    });

    it.each([
      ['a deadline timeout', status.DEADLINE_EXCEEDED, 'DEADLINE_EXCEEDED'],
      ['an unreachable server', status.UNAVAILABLE, 'UNAVAILABLE'],
    ])('still logs the status name when %s leaves no request id', async (_label, code, name) => {
      reply({ code });

      await expect(client.statFiles(CONVERSATION_ID, ['/a'])).rejects.toMatchObject({ code });

      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        `Sandbox RPC sandbox.SandboxService/StatFiles finished with gRPC status ${name}`,
        expect.objectContaining({
          sandbox: { conversation_id: CONVERSATION_ID },
          rpc: expect.objectContaining({ response: { status_code: name } }),
        })
      );
      expect(debugMeta()).not.toHaveProperty('http');
    });

    it('takes the last id when the proxy appended its own to a client-supplied one', async () => {
      reply({
        initialMetadata: metadataWith(REQUEST_ID_HEADER, 'client-supplied, proxy-assigned'),
        response: [],
      });

      await client.statFiles(CONVERSATION_ID, ['/a']);

      expect(debugMeta().http).toEqual({ request: { id: 'proxy-assigned' } });
    });

    it('caps the request id length', async () => {
      reply({ initialMetadata: metadataWith(REQUEST_ID_HEADER, 'a'.repeat(500)), response: [] });

      await client.statFiles(CONVERSATION_ID, ['/a']);

      expect(debugMeta().http?.request.id).toHaveLength(128);
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
    ])('logs %s as a call to the %s method', async (property, rpcName, call) => {
      reply({ initialMetadata: metadataWith(REQUEST_ID_HEADER, 'req-4'), response: [] });

      await call();

      expect(mockRpc.mock.calls[0][0]).toBe(property);
      expect(debugMeta().rpc.method).toBe(`sandbox.SandboxService/${rpcName}`);
      expect(debugMeta().http?.request.id).toBe('req-4');
    });
  });
});
