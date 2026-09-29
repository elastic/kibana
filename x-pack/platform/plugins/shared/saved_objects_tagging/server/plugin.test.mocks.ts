/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const registerRoutesMock = vi.fn();
vi.doMock('./routes', () => {
  const mocked = {
    registerRoutes: registerRoutesMock,
  };
  return { ...mocked, default: mocked };
});

export const createTagUsageCollectorMock = vi.fn();
vi.doMock('./usage', () => {
  const mocked = {
    createTagUsageCollector: createTagUsageCollectorMock,
  };
  return { ...mocked, default: mocked };
});
