/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createManagedOtlpApiKeyHandler } from './handler';

const makeEsClient = (hasAllRequested: boolean) => ({
  security: {
    hasPrivileges: jest.fn().mockResolvedValue({ has_all_requested: hasAllRequested }),
    createApiKey: jest.fn().mockResolvedValue({ encoded: 'encoded-key', id: 'key-id' }),
  },
});

const makeContext = (esClient: ReturnType<typeof makeEsClient>) => ({
  core: Promise.resolve({
    elasticsearch: { client: { asCurrentUser: esClient } },
  }),
});

const mockResponse = {
  ok: jest.fn().mockImplementation((options) => ({ ...options, statusCode: 200 })),
  forbidden: jest.fn().mockImplementation((options) => ({ ...options, statusCode: 403 })),
};

const mockRequest = { body: { name: 'my-collector' } } as any;

beforeEach(() => jest.clearAllMocks());

describe('createManagedOtlpApiKeyHandler', () => {
  it('returns 403 when caller lacks required privileges', async () => {
    const esClient = makeEsClient(false);
    const res = await createManagedOtlpApiKeyHandler(
      makeContext(esClient) as any,
      mockRequest,
      mockResponse as any
    );

    expect(esClient.security.hasPrivileges).toHaveBeenCalledWith(
      expect.objectContaining({
        cluster: ['manage_own_api_key'],
        application: [{ application: 'apm', privileges: ['event:write'], resources: ['*'] }],
      })
    );
    expect(esClient.security.createApiKey).not.toHaveBeenCalled();
    expect(res).toMatchObject({ statusCode: 403 });
  });

  it('creates key as asCurrentUser when caller has required privileges', async () => {
    const esClient = makeEsClient(true);
    const res = await createManagedOtlpApiKeyHandler(
      makeContext(esClient) as any,
      mockRequest,
      mockResponse as any
    );

    expect(esClient.security.createApiKey).toHaveBeenCalledWith(
      expect.objectContaining({
        role_descriptors: {
          otel_managed_service: {
            cluster: [],
            index: [],
            applications: [{ application: 'apm', privileges: ['event:write'], resources: ['*'] }],
          },
        },
      })
    );
    expect(res).toMatchObject({ statusCode: 200 });
  });
});
