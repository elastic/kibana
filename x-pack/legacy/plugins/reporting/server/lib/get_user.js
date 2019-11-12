/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { oncePerServer } from './once_per_server';

function getUserFn(server) {
  return async request => {
    if (!server.plugins.security) {
      return null;
    }

    try {
      return await server.plugins.security.getUser(request);
    } catch (err) {
      server.log(['reporting', 'getUser', 'debug'], err);
      return null;
    }
  };
}

export const getUserFactory = oncePerServer(getUserFn);
