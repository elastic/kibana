/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResourceManagerContract } from './resource_manager';

export function createMockResourceManager() {
  type ResourceManagerMock = jest.Mocked<ResourceManagerContract>;
  const resourceManager = {
    registerResource: jest.fn(),
    startInitialization: jest.fn(),
    waitUntilReady: jest.fn(),
    isReady: jest.fn(),
    ensureResourceReady: jest.fn(),
  } satisfies ResourceManagerMock;

  return resourceManager;
}
