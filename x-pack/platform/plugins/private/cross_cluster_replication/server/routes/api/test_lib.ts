/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { License } from '../../shared_imports';

export function mockRouteContext(mockedFunctions: unknown): RequestHandlerContext {
  const routeContextMock = {
    core: {
      elasticsearch: {
        client: {
          asCurrentUser: mockedFunctions,
        },
      },
    },
  } as unknown as RequestHandlerContext;

  return routeContextMock;
}

export const mockLicense = {
  guardApiRoute: (route: any) => route,
} as License;

export const mockError = { name: 'ResponseError', statusCode: 400 };
