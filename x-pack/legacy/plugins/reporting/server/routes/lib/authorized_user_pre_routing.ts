/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Legacy } from 'kibana';
import { AuthenticatedUser } from '../../../../../../plugins/security/server';
import { ReportingConfig } from '../../../server';
import { LevelLogger } from '../../../server/lib';
import { ReportingSetupDeps } from '../../../server/types';
import { getUserFactory } from '../../lib/get_user';

const superuserRole = 'superuser';

export type PreRoutingFunction = (
  request: Legacy.Request
) => Promise<Boom<null> | AuthenticatedUser | null>;

export const authorizedUserPreRoutingFactory = function authorizedUserPreRoutingFn(
  config: ReportingConfig,
  plugins: ReportingSetupDeps,
  logger: LevelLogger
) {
  const getUser = getUserFactory(plugins.security, logger);
  const { info: xpackInfo } = plugins.__LEGACY.plugins.xpack_main;

  return async function authorizedUserPreRouting(request: Legacy.Request) {
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

    const authorizedRoles = [superuserRole, ...(config.get('roles', 'allow') as string[])];
    if (!user.roles.find(role => authorizedRoles.includes(role))) {
      return Boom.forbidden(`Sorry, you don't have access to Reporting`);
    }

    return user;
  };
};
