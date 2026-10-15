/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SandboxApiClient } from './grpc_client';
import type { RunCommandParams } from './grpc_client';

const mockRunCommand = jest.fn();

jest.mock('@grpc/grpc-js', () => {
  function MockSandboxServiceClient(this: { runCommand: jest.Mock }): void {
    this.runCommand = mockRunCommand;
  }

  return {
    makeClientConstructor: () => MockSandboxServiceClient,
    credentials: { createSsl: () => ({}) },
    Metadata: class MockMetadata {
      readonly entries = new Map<string, string>();
      set(key: string, value: string) {
        this.entries.set(key, value);
      }
    },
  };
});

const okResult = { stdout: '', stderr: '', exit_code: 0, timed_out: false };

describe('SandboxApiClient#runCommand', () => {
  let client: SandboxApiClient;

  beforeEach(() => {
    mockRunCommand.mockReset();
    mockRunCommand.mockImplementation((_request, _metadata, _options, callback) =>
      callback(null, okResult)
    );
    client = new SandboxApiClient({ host: 'sandbox-api', port: 9090, apiKey: 'secret-key' });
  });

  const sentMetadata = (): Map<string, string> => mockRunCommand.mock.calls[0][1].entries;

  it('sends only the authorization and conversation metadata by default', async () => {
    await expect(client.runCommand('space__conv', { command: 'true' })).resolves.toEqual(okResult);

    expect(Object.fromEntries(sentMetadata())).toEqual({
      authorization: 'ApiKey secret-key',
      'x-conversation-id': 'space__conv',
    });
  });

  it('adds allow-listed per-call metadata without putting it into the request', async () => {
    await client.runCommand('space__conv', {
      command: 'curl "$ELASTICSEARCH_URL/_query"',
      metadata: {
        'x-uiam-service-account-id': 'sa-id',
        'x-elasticsearch-url': 'https://es01:9200',
      },
    });

    expect(Object.fromEntries(sentMetadata())).toEqual({
      authorization: 'ApiKey secret-key',
      'x-conversation-id': 'space__conv',
      'x-uiam-service-account-id': 'sa-id',
      'x-elasticsearch-url': 'https://es01:9200',
    });
    expect(mockRunCommand.mock.calls[0][0]).not.toHaveProperty('metadata');
  });

  it.each(['authorization', 'x-conversation-id', 'X-UIAM-SERVICE-ACCOUNT-ID', 'x-other'])(
    'rejects the metadata key `%s` without calling sandbox-api',
    async (key) => {
      const params = {
        command: 'true',
        metadata: { [key]: 'value' },
      } as unknown as RunCommandParams;

      await expect(client.runCommand('space__conv', params)).rejects.toThrow(
        `Unsupported sandbox command metadata key: ${key}`
      );
      expect(mockRunCommand).not.toHaveBeenCalled();
    }
  );
});
