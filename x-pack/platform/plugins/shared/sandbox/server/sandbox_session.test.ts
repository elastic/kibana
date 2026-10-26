/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { Logger } from '@kbn/core/server';
import { SandboxApiClient } from './grpc_client';
import { SandboxSessionImpl } from './sandbox_session';

const mockClose = jest.fn();

interface MockServiceClient {
  close: () => void;
}

jest.mock('@grpc/grpc-js', () => {
  function MockSandboxServiceClient(this: MockServiceClient): void {
    this.close = mockClose;
  }

  return {
    makeClientConstructor: () => MockSandboxServiceClient,
    credentials: {
      createInsecure: () => ({}),
      createSsl: () => ({}),
    },
    Metadata: class MockMetadata {
      set(_key: string, _value: string) {}
    },
  };
});

const sandboxConfig = {
  host: 'sandbox-api',
  port: 50051,
  apiKey: 'secret-key',
  clientCertPem: Buffer.from('mock-cert'),
  clientKeyPem: Buffer.from('mock-key'),
};

const unavailable = (): Error => Object.assign(new Error('UNAVAILABLE'), { code: 14 });

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: Error) => void;
}
const defer = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const okResult = { stdout: '', stderr: '', exit_code: 0, timed_out: false };

describe('SandboxSessionImpl', () => {
  let logger: jest.Mocked<Logger>;
  let apiClient: SandboxApiClient;
  let session: SandboxSessionImpl;
  let runCommand: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    apiClient = new SandboxApiClient(sandboxConfig);
    session = new SandboxSessionImpl('space:conv-1', apiClient, logger);
    runCommand = jest.spyOn(apiClient, 'runCommand');
  });

  const run = () => session.runCommand({ command: 'true' });

  it('starts with isReset=true', () => {
    expect(session.isReset).toBe(true);
  });

  it('sets isReset=false after a successful call', async () => {
    runCommand.mockResolvedValueOnce(okResult);
    await run();
    expect(session.isReset).toBe(false);
  });

  it('sets isReset=true after an UNAVAILABLE failure', async () => {
    runCommand.mockResolvedValueOnce(okResult);
    await run();
    expect(session.isReset).toBe(false);

    runCommand.mockRejectedValueOnce(unavailable());
    await expect(run()).rejects.toMatchObject({ code: 14 });
    expect(session.isReset).toBe(true);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('does not set isReset=true for non-UNAVAILABLE errors', async () => {
    runCommand.mockResolvedValueOnce(okResult);
    await run();
    expect(session.isReset).toBe(false);

    runCommand.mockRejectedValueOnce(Object.assign(new Error('INTERNAL'), { code: 13 }));
    await expect(run()).rejects.toMatchObject({ code: 13 });
    expect(session.isReset).toBe(false);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not clear isReset when a stale success from an older generation arrives late', async () => {
    // Call A starts under generation 0. Before it resolves, call B fails with UNAVAILABLE,
    // bumping the generation to 1 and setting isReset=true.
    // A's late success must not clear the isReset that generation 1 installed.
    const callA = defer<typeof okResult>();
    runCommand.mockReturnValueOnce(callA.promise);

    const resultA = run();

    // B fails UNAVAILABLE → generation bumped to 1, isReset=true.
    runCommand.mockRejectedValueOnce(unavailable());
    await expect(run()).rejects.toMatchObject({ code: 14 });
    expect(session.isReset).toBe(true);

    // A's stale success (started in generation 0) arrives now.
    callA.resolve(okResult);
    await resultA;

    // isReset must still be true — a stale success from the old pod must not win.
    expect(session.isReset).toBe(true);
  });

  it('does not set isReset=true when a stale UNAVAILABLE from an older generation arrives late', async () => {
    // Call A and call B both run and fail with UNAVAILABLE (generation 0).
    const callB = defer<never>();
    runCommand.mockRejectedValueOnce(unavailable()).mockReturnValueOnce(callB.promise);

    const resultA = run();
    const resultB = run();
    await expect(resultA).rejects.toMatchObject({ code: 14 });
    // isReset is now true, generation bumped to 1.

    // Call G succeeds under generation 1.
    runCommand.mockResolvedValueOnce(okResult);
    await run();
    expect(session.isReset).toBe(false);

    // B's stale UNAVAILABLE (started in generation 0) arrives now.
    callB.reject(unavailable());
    await expect(resultB).rejects.toMatchObject({ code: 14 });

    // isReset must still be false — the stale failure must not win.
    expect(session.isReset).toBe(false);
    expect(logger.warn).toHaveBeenCalledTimes(1); // only A's reset logged
  });
});

describe('SandboxApiClient', () => {
  let client: SandboxApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SandboxApiClient({
      host: 'sandbox-api',
      port: 50051,
      apiKey: 'secret-key',
      rootCertPem: Buffer.from('mock-ca'),
      clientCertPem: Buffer.from('mock-cert'),
      clientKeyPem: Buffer.from('mock-key'),
    });
  });

  it('closes the underlying gRPC client', () => {
    client.close();
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
