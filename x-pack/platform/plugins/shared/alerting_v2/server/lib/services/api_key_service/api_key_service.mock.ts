/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiKeyServiceContract } from './api_key_service';

export const createMockApiKeyService = (): jest.Mocked<ApiKeyServiceContract> => ({
  create: jest.fn().mockResolvedValue({
    apiKey: 'encoded-es-api-key',
    type: 'es',
    owner: 'test-user',
    createdByUser: false,
  }),
});
