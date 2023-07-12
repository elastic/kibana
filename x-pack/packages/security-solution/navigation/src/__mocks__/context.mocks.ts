/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';

export const mockNavigateToApp = jest.fn();
export const mockGetUrlForApp = jest.fn();

export const mockCoreStart = {
  application: {
    navigateToApp: mockNavigateToApp,
    getUrlForApp: mockGetUrlForApp,
  },
} as unknown as CoreStart;
