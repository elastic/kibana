/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';

import type { ReportingCore } from '../../core';
import type { ReportingUser } from '../../types';

import { getUser } from './get_user';

interface GetAuthorizedUserOptions {
  /** If true, throws if security is disabled. Default: false */
  requireSecurity?: boolean;
}

export async function getAuthorizedUser(
  reporting: ReportingCore,
  req: KibanaRequest,
  options: GetAuthorizedUserOptions = {}
): Promise<ReportingUser> {
  const { requireSecurity = false } = options;
  const { security: securitySetup } = reporting.getPluginSetupDeps();
  const { securityService } = await reporting.getPluginStartDeps();

  const securityEnabled = !!(securitySetup && securitySetup.license.isEnabled());

  if (!securityEnabled) {
    if (requireSecurity) {
      throw Boom.forbidden('Security must be enabled for this operation');
    }
    return undefined;
  }

  // Security is enabled - user must be authenticated
  const user = getUser(req, securityService);
  if (!user) {
    throw Boom.unauthorized(`Sorry, you aren't authenticated`);
  }

  return user;
}
