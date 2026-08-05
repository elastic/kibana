/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiKeyInvalidationResult, ApiKeyServiceContract } from './api_key_service';

export const createMockApiKeyService = (): jest.Mocked<ApiKeyServiceContract> => ({
  create: jest.fn().mockResolvedValue({
    apiKey: 'encoded-es-api-key',
    owner: 'test-user',
    createdByUser: false,
  }),
  // Results are index-aligned with the requested keys, so the default has to
  // depend on the argument rather than being a fixed value.
  markApiKeysForInvalidation: jest.fn(
    async (apiKeys: string[]): Promise<ApiKeyInvalidationResult[]> =>
      apiKeys.map(() => ({ success: true }))
  ),
});
