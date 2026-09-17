/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SandboxConnectionManager } from './grpc_client';
import type { SandboxCallContext } from './tool_utils';

jest.mock('@grpc/grpc-js', () => {
  const actual = jest.requireActual<typeof import('@grpc/grpc-js')>('@grpc/grpc-js');
  function MockSandboxServiceClient(this: { close: () => void }): void {
    this.close = jest.fn();
  }
  return { ...actual, makeClientConstructor: () => MockSandboxServiceClient };
});

const unavailable = () =>
  Object.assign(new Error('14 UNAVAILABLE: allocate sandbox'), { code: 14 });
const callContext = { allowedConnectorIds: ['telemetry'] } as unknown as SandboxCallContext;
const config = { sandbox_api_host: 'sandbox-api', sandbox_api_port: 9090, sandbox_api_key: 'k' };

const createManager = (writeManifest: jest.Mock) => {
  const manager = new SandboxConnectionManager({
    config: config as ConstructorParameters<typeof SandboxConnectionManager>[0]['config'],
    logger: loggingSystemMock.createLogger(),
    writeManifest,
    manifestRetry: { attempts: 3, delayMs: 1 },
  });
  jest
    .spyOn(manager.apiClient, 'runCommand')
    .mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as never);
  return manager;
};

const run = (manager: SandboxConnectionManager) =>
  manager.runCommand('conversation', { command: 'true' } as never, callContext);

describe('SandboxConnectionManager manifest write', () => {
  it('retries the manifest write while the fresh sandbox reports UNAVAILABLE', async () => {
    const writeManifest = jest
      .fn()
      .mockRejectedValueOnce(unavailable())
      .mockRejectedValueOnce(unavailable())
      .mockResolvedValue(undefined);
    const manager = createManager(writeManifest);

    await run(manager);
    await run(manager);

    // Two failed attempts, one success; the second command sees the manifest as current.
    expect(writeManifest).toHaveBeenCalledTimes(3);
  });

  it('keeps trying on later commands when every retry of the initial write failed', async () => {
    const writeManifest = jest
      .fn()
      .mockRejectedValueOnce(unavailable())
      .mockRejectedValueOnce(unavailable())
      .mockRejectedValueOnce(unavailable())
      .mockRejectedValueOnce(unavailable())
      .mockResolvedValue(undefined);
    const manager = createManager(writeManifest);

    // Initial write exhausts its three attempts, then the same command's refresh pass retries
    // (one more UNAVAILABLE, then success).
    await run(manager);
    expect(writeManifest).toHaveBeenCalledTimes(5);

    // Once written, later commands leave the manifest alone.
    await run(manager);
    expect(writeManifest).toHaveBeenCalledTimes(5);
  });

  it('does not retry errors other than UNAVAILABLE within a write', async () => {
    const writeManifest = jest.fn().mockRejectedValue(new Error('boom'));
    const manager = createManager(writeManifest);

    await run(manager);

    // One initial attempt plus the same command's refresh pass; no backoff retries in between.
    expect(writeManifest).toHaveBeenCalledTimes(2);
  });
});
