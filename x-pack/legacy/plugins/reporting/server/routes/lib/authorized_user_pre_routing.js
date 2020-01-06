/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { getUserFactory } from '../../lib/get_user';

const superuserRole = 'superuser';

export const authorizedUserPreRoutingFactory = function authorizedUserPreRoutingFn(server) {
  const getUser = getUserFactory(server);
  const config = server.config();

  return async function authorizedUserPreRouting(request) {
    console.log('how are you');
    const xpackInfo = server.plugins.xpack_main.info;

    if (!xpackInfo || !xpackInfo.isAvailable()) {
      server.log(
        ['reporting', 'authorizedUserPreRouting', 'debug'],
        'Unable to authorize user before xpack info is available.'
      );
      return boom.notFound();
    }

    const security = xpackInfo.feature('security');
    if (!security.isEnabled() || !security.isAvailable()) {
      return null;
    }

    const user = await getUser(request);

    if (!user) {
      return boom.unauthorized(`Sorry, you aren't authenticated`);
    }

    const authorizedRoles = [superuserRole, ...config.get('xpack.reporting.roles.allow')];
    if (!user.roles.find(role => authorizedRoles.includes(role))) {
      return boom.forbidden(`Sorry, you don't have access to Reporting`);
    }

    return user;
  };
};
