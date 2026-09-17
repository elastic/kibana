/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { SandboxApiClient, SandboxConnectionManager } from './grpc_client';
import type { SandboxCallContext } from './tool_utils';

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
  api_key: 'secret-key',
  ssl: {
    certificate: 'mock-cert',
    key: 'mock-key',
  },
};

describe('grpc_client', () => {
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

  describe('close', () => {
    it('closes the underlying gRPC client', () => {
      client.close();
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });
});

describe('SandboxConnectionManager', () => {
  const conversationId = 'conv-1';
  const callContext: SandboxCallContext = {
    request: {} as KibanaRequest,
    allowedConnectorIds: [],
  };
  const unavailable = () => Object.assign(new Error('UNAVAILABLE'), { code: 14 });

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

  let logger: jest.Mocked<Logger>;
  let writeManifest: jest.Mock<Promise<void>, [string, SandboxCallContext]>;
  let manager: SandboxConnectionManager;
  let runCommand: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    writeManifest = jest.fn().mockResolvedValue(undefined);
    manager = new SandboxConnectionManager({
      config: sandboxConfig,
      logger,
      writeManifest,
    });
    runCommand = jest.spyOn(manager.apiClient, 'runCommand');
  });

  const run = () => manager.runCommand(conversationId, { command: 'true' }, callContext);

  it('re-initializes on the next call after an UNAVAILABLE failure', async () => {
    runCommand.mockRejectedValueOnce(unavailable());
    await expect(run()).rejects.toMatchObject({ code: 14 });
    expect(writeManifest).toHaveBeenCalledTimes(1);

    runCommand.mockResolvedValueOnce({ stdout: '', stderr: '', exit_code: 0, timed_out: false });
    await run();
    expect(writeManifest).toHaveBeenCalledTimes(2);
  });

  it('does not clear init state installed by a later call when a stale UNAVAILABLE arrives late', async () => {
    // Init generation 1: caller A and caller B both run under it against the same dead pod.
    const callB = defer<never>();
    runCommand.mockRejectedValueOnce(unavailable()).mockReturnValueOnce(callB.promise);

    const resultA = run();
    const resultB = run();
    await expect(resultA).rejects.toMatchObject({ code: 14 });
    expect(writeManifest).toHaveBeenCalledTimes(1);

    // Caller G arrives after A's reset and installs init generation 2 against a fresh pod.
    runCommand.mockResolvedValueOnce({ stdout: '', stderr: '', exit_code: 0, timed_out: false });
    await run();
    expect(writeManifest).toHaveBeenCalledTimes(2);

    // B's stale failure from generation 1 arrives now. It must not evict generation 2.
    callB.reject(unavailable());
    await expect(resultB).rejects.toMatchObject({ code: 14 });

    // Caller H reuses generation 2: no third init.
    runCommand.mockResolvedValueOnce({ stdout: '', stderr: '', exit_code: 0, timed_out: false });
    await run();
    expect(writeManifest).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('does not clear a newer init generation when an older failed init settles', async () => {
    const initialized = (manager as unknown as { initialized: Map<string, Promise<void>> })
      .initialized;
    const initializeConversation = jest.spyOn(
      manager as unknown as { initializeConversation: () => Promise<void> },
      'initializeConversation'
    );

    // Generation 1 init is in flight and will eventually fail.
    const init1 = defer<void>();
    initializeConversation.mockReturnValueOnce(init1.promise);
    const resultA = run();
    expect(initializeConversation).toHaveBeenCalledTimes(1);

    // A stale UNAVAILABLE reset from an even older generation wipes the map (pre-fix
    // behaviour), then caller G installs generation 2 against a fresh pod.
    initialized.delete(conversationId);
    runCommand.mockResolvedValueOnce({ stdout: '', stderr: '', exit_code: 0, timed_out: false });
    await run();
    expect(initializeConversation).toHaveBeenCalledTimes(2);
    const generation2 = initialized.get(conversationId);
    expect(generation2).toBeDefined();

    // Generation 1 settles as a failure. Its cleanup must not evict generation 2.
    init1.reject(new Error('init exploded'));
    await expect(resultA).rejects.toThrow('init exploded');
    expect(initialized.get(conversationId)).toBe(generation2);

    // Caller H reuses generation 2: no third init.
    runCommand.mockResolvedValueOnce({ stdout: '', stderr: '', exit_code: 0, timed_out: false });
    await run();
    expect(initializeConversation).toHaveBeenCalledTimes(2);
  });
});
