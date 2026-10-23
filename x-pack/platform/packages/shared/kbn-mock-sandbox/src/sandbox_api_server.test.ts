/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { promisify } from 'util';
import * as grpc from '@grpc/grpc-js';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';
import { sandboxServiceDefinition } from '@kbn/sandbox-proto';
import type { MockSandboxServer, SandboxBackend } from './sandbox_api_server';
import { SandboxUnavailableError, startMockSandboxServer } from './sandbox_api_server';

const API_KEY = 'test-key';

const backend: jest.Mocked<SandboxBackend> = {
  runCommand: jest.fn(),
  statFiles: jest.fn(),
  readFiles: jest.fn(),
  writeFiles: jest.fn(),
  mkdirs: jest.fn(),
};

const SandboxClient = grpc.makeClientConstructor(sandboxServiceDefinition, 'SandboxService');

type UnaryMethod = (
  request: unknown,
  metadata: grpc.Metadata,
  callback: (error: grpc.ServiceError | null, response: unknown) => void
) => void;

describe('startMockSandboxServer', () => {
  let server: MockSandboxServer;
  let client: grpc.Client;

  const call = (method: keyof typeof sandboxServiceDefinition, request: unknown, md = {}) => {
    const metadata = new grpc.Metadata();
    for (const [key, value] of Object.entries({
      authorization: `ApiKey ${API_KEY}`,
      'x-conversation-id': 'default__conv-1',
      ...md,
    })) {
      metadata.set(key, value as string);
    }
    const fn = (client as unknown as Record<string, UnaryMethod>)[method].bind(client);
    return promisify(fn)(request, metadata);
  };

  beforeAll(async () => {
    server = await startMockSandboxServer({
      backend,
      log: new ToolingLog(),
      port: 0,
      apiKey: API_KEY,
      tls: { certificate: fs.readFileSync(KBN_CERT_PATH), key: fs.readFileSync(KBN_KEY_PATH) },
    });
    client = new SandboxClient(
      `localhost:${server.port}`,
      grpc.credentials.createSsl(fs.readFileSync(CA_CERT_PATH))
    );
  });

  afterAll(async () => {
    client.close();
    await server.close();
  });

  beforeEach(() => jest.resetAllMocks());

  it('serves RunCommand over TLS and passes the conversation id to the backend', async () => {
    backend.runCommand.mockResolvedValue({
      stdout: 'hi\n',
      stderr: '',
      exit_code: 3,
      timed_out: false,
    });

    const response = await call('runCommand', {
      command: 'echo hi',
      env: { FOO: 'bar' },
      directory: '/workspace',
      timeout_seconds: 5,
      task_group_id: '',
    });

    expect(response).toEqual({ stdout: 'hi\n', stderr: '', exit_code: 3, timed_out: false });
    expect(backend.runCommand).toHaveBeenCalledWith(
      'default__conv-1',
      expect.objectContaining({ command: 'echo hi', env: { FOO: 'bar' }, timeout_seconds: 5 }),
      expect.any(AbortSignal)
    );
  });

  it('serves the file RPCs', async () => {
    backend.statFiles.mockResolvedValue([
      { path: '/workspace/a', size: 1, is_dir: false, exists: true, modified_time_sec: 10 },
    ]);
    backend.readFiles.mockResolvedValue([
      { path: '/workspace/a', content: Buffer.from('a'), success: true },
    ]);
    backend.writeFiles.mockResolvedValue([{ bytes_written: 1, success: true }]);
    backend.mkdirs.mockResolvedValue([true, false]);

    await expect(call('statFiles', ['/workspace/a'])).resolves.toEqual([
      { path: '/workspace/a', size: 1, is_dir: false, exists: true, modified_time_sec: 10 },
    ]);
    await expect(call('readFiles', [{ path: '/workspace/a', maxReadBytes: 5 }])).resolves.toEqual([
      { path: '/workspace/a', content: Buffer.from('a'), success: true },
    ]);
    expect(backend.readFiles).toHaveBeenCalledWith('default__conv-1', [
      { path: '/workspace/a', maxReadBytes: 5 },
    ]);
    await expect(
      call('writeFiles', [{ path: '/workspace/a', content: Buffer.from('a') }])
    ).resolves.toEqual([{ bytes_written: 1, success: true }]);
    await expect(call('mkdirs', ['/workspace/d', '/etc/x'])).resolves.toEqual([true, false]);
  });

  it('maps SandboxUnavailableError to UNAVAILABLE', async () => {
    backend.statFiles.mockRejectedValue(new SandboxUnavailableError('gone'));
    await expect(call('statFiles', ['/workspace'])).rejects.toMatchObject({
      code: grpc.status.UNAVAILABLE,
    });
  });

  it('rejects a wrong API key', async () => {
    await expect(
      call('mkdirs', ['/workspace/d'], { authorization: 'ApiKey wrong' })
    ).rejects.toMatchObject({ code: grpc.status.UNAUTHENTICATED });
    expect(backend.mkdirs).not.toHaveBeenCalled();
  });

  it('rejects a conversation id that is not a valid container name', async () => {
    await expect(
      call('mkdirs', ['/workspace/d'], { 'x-conversation-id': 'bad id/../x' })
    ).rejects.toMatchObject({ code: grpc.status.INVALID_ARGUMENT });
  });
});
