/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as grpc from '@grpc/grpc-js';
import { loggerMock } from '@kbn/logging-mocks';
import { SandboxApiClient } from './grpc_client';
import { SandboxRpcError } from './rpc';

// The only part of grpc-js that is replaced is the channel credentials: the client always asks for
// TLS, and the server of this suite does not speak it. The call machinery that result delivery and
// request id capture depend on (the order of the callback, `metadata` and `status`, and where the
// trailers arrive) is the real one, which the mocked suite in sandbox_api_client.test.ts cannot show.
jest.mock('@grpc/grpc-js', () => {
  const actual = jest.requireActual('@grpc/grpc-js');
  return {
    ...actual,
    credentials: { ...actual.credentials, createSsl: () => actual.credentials.createInsecure() },
  };
});

const CONVERSATION_ID = 'space__conv-1';
const REQUEST_ID_HEADER = 'x-cloud-request-id';
const MKDIRS_PATH = '/sandbox.SandboxService/Mkdirs';
/** `MkdirsResponse { success: [true] }` */
const MKDIRS_OK = Buffer.from([0x0a, 0x01, 0x01]);
/** The deadline of a file RPC in the client, which a test cannot wait for. */
const FILE_RPC_DEADLINE_MS = 30_000;

const identity = (buffer: Buffer): Buffer => buffer;

type MkdirsHandler = grpc.handleUnaryCall<Buffer, Buffer>;

describe('SandboxApiClient over a real grpc-js channel', () => {
  let server: grpc.Server;
  let client: SandboxApiClient;
  let handler: jest.Mock<ReturnType<MkdirsHandler>, Parameters<MkdirsHandler>>;

  const metadataWith = (value: string): grpc.Metadata => {
    const metadata = new grpc.Metadata();
    metadata.add(REQUEST_ID_HEADER, value);
    return metadata;
  };

  beforeAll(async () => {
    handler = jest.fn();
    server = new grpc.Server();
    server.addService(
      {
        mkdirs: {
          path: MKDIRS_PATH,
          requestStream: false,
          responseStream: false,
          requestSerialize: identity,
          requestDeserialize: identity,
          responseSerialize: identity,
          responseDeserialize: identity,
        },
      },
      { mkdirs: (call, callback) => handler(call, callback) }
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

  beforeEach(() => {
    handler.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delivers the result with the request id from the initial metadata', async () => {
    handler.mockImplementation((call, callback) => {
      call.sendMetadata(metadataWith('req-1'));
      callback(null, MKDIRS_OK);
    });

    await expect(client.mkdirs(CONVERSATION_ID, ['/a'])).resolves.toMatchObject({
      value: [true],
      rpc: {
        requestId: 'req-1',
        conversationId: CONVERSATION_ID,
        method: 'sandbox.SandboxService/Mkdirs',
        statusCode: 'OK',
      },
    });
    const [call] = handler.mock.calls[0];
    expect(call.metadata.get('x-conversation-id')).toEqual([CONVERSATION_ID]);
    expect(call.metadata.get('authorization')).toEqual(['ApiKey secret-key']);
  });

  it('reads the request id from the trailers of an error that sends no initial metadata', async () => {
    handler.mockImplementation((_call, callback) => {
      callback({ code: grpc.status.UNAVAILABLE, details: 'gone', metadata: metadataWith('req-2') });
    });

    const error = await client.mkdirs(CONVERSATION_ID, ['/a']).catch((err) => err);

    expect(error).toBeInstanceOf(SandboxRpcError);
    expect(error).toMatchObject({
      code: grpc.status.UNAVAILABLE,
      details: 'gone',
      rpc: { requestId: 'req-2', statusCode: 'UNAVAILABLE' },
    });
  });

  it('reports an error with the status name and no request id when the server sends none', async () => {
    handler.mockImplementation((_call, callback) => {
      callback({ code: grpc.status.INTERNAL, details: 'boom' });
    });

    const error = await client.mkdirs(CONVERSATION_ID, ['/a']).catch((err) => err);

    expect(error).toMatchObject({ code: grpc.status.INTERNAL, rpc: { statusCode: 'INTERNAL' } });
    expect(error.rpc.requestId).toBeUndefined();
  });

  it('rejects with DEADLINE_EXCEEDED, and no request id, when the server does not answer in time', async () => {
    handler.mockImplementation(() => {
      // Never answers.
    });
    // The client takes the deadline from the clock once, as it makes the call, and file RPCs wait
    // 30 seconds. Making that one reading 29.95 seconds early gives the call a deadline of 50 ms.
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValueOnce(now - (FILE_RPC_DEADLINE_MS - 50));

    const error = await client.mkdirs(CONVERSATION_ID, ['/a']).catch((err) => err);

    expect(error).toBeInstanceOf(SandboxRpcError);
    expect(error).toMatchObject({
      code: grpc.status.DEADLINE_EXCEEDED,
      rpc: { statusCode: 'DEADLINE_EXCEEDED' },
    });
    expect(error.rpc.requestId).toBeUndefined();
  });
});
