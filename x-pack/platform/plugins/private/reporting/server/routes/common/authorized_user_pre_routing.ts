/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RequestHandler, RouteMethod } from '@kbn/core/server';

import type { ReportingCore } from '../../core';
import type { ReportingUser, ReportingRequestHandlerContext } from '../../types';
import { getAuthorizedUser } from './get_authorized_user';

export type RequestHandlerUser<P, Q, B> = RequestHandler<
  P,
  Q,
  B,
  ReportingRequestHandlerContext
> extends (...a: infer U) => infer R
  ? (user: ReportingUser, ...a: U) => R
  : never;

export const authorizedUserPreRouting = <P, Q, B>(
  reporting: ReportingCore,
  handler: RequestHandlerUser<P, Q, B>
): RequestHandler<P, Q, B, ReportingRequestHandlerContext, RouteMethod> => {
  const { logger } = reporting.getPluginSetupDeps();

  return async (context, req, res) => {
    try {
      const user = await getAuthorizedUser(reporting, req);

      return handler(user, context, req, res);
    } catch (err) {
      logger.error(err);
      if (err instanceof Boom.Boom) {
        return res.custom({
          statusCode: err.output.statusCode,
          body: err.output.payload.message,
        });
      }
      return res.custom({ statusCode: 500 });
    }
  };
};
