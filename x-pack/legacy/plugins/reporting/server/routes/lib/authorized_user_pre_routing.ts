/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Legacy } from 'kibana';
import { AuthenticatedUser } from '../../../../../../plugins/security/server';
import { Logger, ServerFacade } from '../../../types';
import { getUserFactory } from '../../lib/get_user';
import { ReportingSetupDeps } from '../../types';

const superuserRole = 'superuser';

export type PreRoutingFunction = (
  request: Legacy.Request
) => Promise<Boom<null> | AuthenticatedUser | null>;

export const authorizedUserPreRoutingFactory = function authorizedUserPreRoutingFn(
  server: ServerFacade,
  plugins: ReportingSetupDeps,
  logger: Logger
) {
  const getUser = getUserFactory(server, plugins.security);
  const config = server.config();

  return async function authorizedUserPreRouting(request: Legacy.Request) {
    const xpackInfo = server.plugins.xpack_main.info;

    if (!xpackInfo || !xpackInfo.isAvailable()) {
      logger.warn('Unable to authorize user before xpack info is available.', [
        'authorizedUserPreRouting',
      ]);
      return Boom.notFound();
    }

    const security = xpackInfo.feature('security');
    if (!security.isEnabled() || !security.isAvailable()) {
      return null;
    }

    const user = await getUser(request);

    if (!user) {
      return Boom.unauthorized(`Sorry, you aren't authenticated`);
    }

    const authorizedRoles = [
      superuserRole,
      ...(config.get('xpack.reporting.roles.allow') as string[]),
    ];
    if (!user.roles.find(role => authorizedRoles.includes(role))) {
      return Boom.forbidden(`Sorry, you don't have access to Reporting`);
    }

    return user;
  };
};
