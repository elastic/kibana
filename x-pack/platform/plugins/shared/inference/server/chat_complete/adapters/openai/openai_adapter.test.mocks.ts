/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const isNativeFunctionCallingSupportedMock = vi.fn();

vi.doMock('../../utils/function_calling_support', async () => {
  const actual = (await vi.importActual('../../utils/function_calling_support'));
  return {
    ...actual,
    isNativeFunctionCallingSupported: isNativeFunctionCallingSupportedMock,
  };
});
