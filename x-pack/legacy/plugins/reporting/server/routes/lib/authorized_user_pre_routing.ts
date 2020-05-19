/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { KibanaRequest } from 'src/core/server';
import { AuthenticatedUser } from '../../../../../../plugins/security/server';
import { ReportingConfig } from '../../../server';
import { LevelLogger as Logger } from '../../../server/lib';
import { getUserFactory } from '../../lib/get_user';
import { ReportingSetupDeps } from '../../types';

const superuserRole = 'superuser';

export type PreRoutingFunction = (
  request: KibanaRequest
) => Promise<Boom<null> | AuthenticatedUser | null>;

export const authorizedUserPreRoutingFactory = function authorizedUserPreRoutingFn(
  config: ReportingConfig,
  plugins: ReportingSetupDeps,
  logger: Logger
) {
  const getUser = getUserFactory(plugins.security, logger);

  return function authorizedUserPreRouting(request: KibanaRequest) {
    const user = getUser(request);

    if (!user) {
      throw Boom.unauthorized(`Sorry, you aren't authenticated`);
    }

    const authorizedRoles = [superuserRole, ...(config.get('roles', 'allow') as string[])];
    if (!user.roles.find(role => authorizedRoles.includes(role))) {
      throw Boom.forbidden(`Sorry, you don't have access to Reporting`);
    }

    return user;
  };
};
