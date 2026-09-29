/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { getDescriptorNamespace } from './get_descriptor_namespace';

export const mockGetDescriptorNamespace = vi.fn() as MockedFunction<typeof getDescriptorNamespace>;

vi.mock('./get_descriptor_namespace', () => {
  return {
    getDescriptorNamespace: mockGetDescriptorNamespace,
  };
});
