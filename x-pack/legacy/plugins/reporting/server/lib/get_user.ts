/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { KibanaRequest } from '../../../../../../src/core/server';
import { Logger, ServerFacade } from '../../types';
import { ReportingSetupDeps } from '../plugin';

export function getUserFactory(
  server: ServerFacade,
  security: ReportingSetupDeps['security'],
  logger: Logger
) {
  /*
   * Legacy.Request because this is called from routing middleware
   */
  return async (request: Legacy.Request) => {
    if (!security) {
      return null;
    }

    try {
      return await security.authc.getCurrentUser(KibanaRequest.from(request));
    } catch (err) {
      logger.error(err, ['getUser']);
      return null;
    }
  };
}
