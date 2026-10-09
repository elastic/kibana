/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as grpc from '@grpc/grpc-js';
import { SandboxApiClient, SANDBOX_CALL_DEADLINE_MS } from './grpc_client';

type UnaryStub = jest.Mock<
  void,
  [unknown, grpc.Metadata, grpc.CallOptions, (err: Error | null, res: unknown) => void]
>;

const createClient = () => {
  const apiClient = new SandboxApiClient({ host: 'localhost', port: 1, apiKey: 'key' });
  const stub: UnaryStub = jest.fn((_req, _md, _options, callback) => callback(null, []));
  const grpcClient = (apiClient as unknown as { client: Record<string, UnaryStub> }).client;
  for (const method of ['runCommand', 'statFiles', 'readFiles', 'writeFiles', 'mkdirs']) {
    grpcClient[method] = stub;
  }
  return { apiClient, stub };
};

describe('SandboxApiClient deadlines', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-10-06T12:00:00Z')));
  afterEach(() => jest.useRealTimers());

  it('sets a hard deadline on every RPC', async () => {
    const { apiClient, stub } = createClient();

    await apiClient.runCommand('conv', { command: 'true' });
    await apiClient.statFiles('conv', ['/workspace']);
    await apiClient.readFiles('conv', [{ path: '/workspace/a' }]);
    await apiClient.writeFiles('conv', [{ path: '/workspace/a', content: Buffer.from('a') }]);
    await apiClient.mkdirs('conv', ['/workspace/b']);

    expect(stub).toHaveBeenCalledTimes(5);
    for (const [, , options] of stub.mock.calls) {
      expect(options.deadline).toBe(Date.now() + SANDBOX_CALL_DEADLINE_MS);
    }
    apiClient.close();
  });

  it('caps every RPC at five minutes', () => {
    expect(SANDBOX_CALL_DEADLINE_MS).toBe(5 * 60 * 1000);
  });
});
