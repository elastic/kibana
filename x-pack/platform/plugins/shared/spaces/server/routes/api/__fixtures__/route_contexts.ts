/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandlerContext } from '@kbn/core/server';

export const mockRouteContext = {
  licensing: {
    license: {
      check: jest.fn().mockReturnValue({
        state: 'valid',
      }),
    },
  },
} as unknown as RequestHandlerContext;

export const mockRouteContextWithInvalidLicense = {
  licensing: {
    license: {
      check: jest.fn().mockReturnValue({
        state: 'invalid',
        message: 'License is invalid for spaces',
      }),
    },
  },
} as unknown as RequestHandlerContext;
