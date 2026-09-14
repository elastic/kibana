/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SandboxApiClient } from './grpc_client';

const mockClose = jest.fn();

interface MockServiceClient {
  close: () => void;
}

jest.mock('@grpc/grpc-js', () => {
  const actual = jest.requireActual<typeof import('@grpc/grpc-js')>('@grpc/grpc-js');

  function MockSandboxServiceClient(this: MockServiceClient): void {
    this.close = mockClose;
  }

  return {
    ...actual,
    makeClientConstructor: () => MockSandboxServiceClient,
  };
});

describe('grpc_client', () => {
  let client: SandboxApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SandboxApiClient({ host: 'sandbox-api', port: 50051, apiKey: 'secret-key' });
  });

  describe('close', () => {
    it('closes the underlying gRPC client', () => {
      client.close();
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });
});
