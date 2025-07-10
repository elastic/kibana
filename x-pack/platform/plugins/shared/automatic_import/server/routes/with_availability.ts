/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler, RouteMethod } from '@kbn/core/server';
import { AutomaticImportRouteHandlerContext } from '../plugin';

/**
 * Wraps a request handler with a check for whether the API route is available.
 * The `isAvailable` flag must be provided by the context and be consistent with the required
 * license (stateful) or product type (serverless).
 */
export const withAvailability = <
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends RouteMethod = never
>(
  handler: RequestHandler<P, Q, B, AutomaticImportRouteHandlerContext, Method>
): RequestHandler<P, Q, B, AutomaticImportRouteHandlerContext, Method> => {
  return async (context, req, res) => {
    const { isAvailable } = await context.automaticImport;
    if (!isAvailable()) {
      return res.notFound({
        body: { message: 'This API route is not available using your current license/tier.' },
      });
    }
    return handler(context, req, res);
  };
};
