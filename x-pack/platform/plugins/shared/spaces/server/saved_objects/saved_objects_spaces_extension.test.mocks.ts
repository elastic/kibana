/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { spaceIdToNamespace } from '../lib/utils/namespace';

export const mockSpaceIdToNamespace = vi.fn() as MockedFunction<typeof spaceIdToNamespace>;

vi.mock('../lib/utils/namespace', () => {
  return {
    spaceIdToNamespace: mockSpaceIdToNamespace,
  };
});
