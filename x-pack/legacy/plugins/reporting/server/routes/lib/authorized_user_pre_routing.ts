/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, RouteMethod } from 'src/core/server';
import { AuthenticatedUser } from '../../../../../../plugins/security/server';
import { getUserFactory } from '../../lib/get_user';
import { ReportingInternalSetup, ReportingCore } from '../../core';

const superuserRole = 'superuser';

export type RequestHandlerUser = RequestHandler extends (...a: infer U) => infer R
  ? (user: AuthenticatedUser | null, ...a: U) => R
  : never;

export const authorizedUserPreRoutingFactory = function authorizedUserPreRoutingFn(
  core: ReportingCore,
  setupDeps: ReportingInternalSetup
) {
  const config = core.getConfig();
  const getUser = getUserFactory(setupDeps.security);

  return <P, Q, B>(handler: RequestHandlerUser): RequestHandler<P, Q, B, RouteMethod> => {
    return (context, req, res) => {
      // TODO: license checking

      let user: AuthenticatedUser | null = null;
      if (deps.security) {
        user = getUser(req);
        if (!user) {
          return res.unauthorized({
            body: `Sorry, you aren't authenticated`,
          });
        }
      }

      if (user) {
        const allowedRoles = config.get('roles', 'allow') || [];
        const authorizedRoles = [superuserRole, ...allowedRoles];

        if (user && !user.roles.find((role) => authorizedRoles.includes(role))) {
          return res.forbidden({
            body: `Sorry, you don't have access to Reporting`,
          });
        }
      }

      return handler(user, context, req, res);
    };
  };
};
