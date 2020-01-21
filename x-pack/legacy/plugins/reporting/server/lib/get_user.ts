/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { Logger, ServerFacade } from '../../types';

export function getUserFactory(server: ServerFacade, logger: Logger) {
  /*
   * Legacy.Request because this is called from routing middleware
   */
  return async (request: Legacy.Request) => {
    if (!server.plugins.security) {
      return null;
    }

    try {
      return await server.plugins.security.getUser(request);
    } catch (err) {
      logger.error(err);
      return null;
    }
  };
}
