/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { isUnauthorizedError } from '@kbn/es-errors';

/**
 * True when the API key on this request can act in its space.
 */
export const authorizeKibanaInboundRequest = async (
  request: KibanaRequest,
  getStartServices: CoreSetup<{ security?: SecurityPluginStart }>['getStartServices']
): Promise<boolean> => {
  const [, plugins] = await getStartServices();
  const checkPrivileges = plugins.security?.authz?.checkPrivilegesDynamicallyWithRequest(request);
  if (!checkPrivileges) {
    return false;
  }

  try {
    const { hasAllRequested } = await checkPrivileges({});
    return hasAllRequested;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return false;
    }
    throw error;
  }
};
