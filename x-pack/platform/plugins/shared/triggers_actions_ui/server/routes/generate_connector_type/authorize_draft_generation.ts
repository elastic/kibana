/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { SUPERUSER_PRIVILEGES } from '@kbn/security-plugin/common';

/** Applies the same superuser requirement as the connector draft HTTP route. */
export const authorizeDraftGeneration = async (
  security: SecurityPluginStart,
  request: KibanaRequest
): Promise<void> => {
  const { hasAllRequested } = await security.authz
    .checkPrivilegesWithRequest(request)
    .globally(SUPERUSER_PRIVILEGES);
  if (!hasAllRequested) {
    throw Boom.forbidden('Superuser access is required to generate a connector type draft.');
  }
};
