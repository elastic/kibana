/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { PLUGIN_ID } from '../../common';

/**
 * Returns whether the request may read osquery results.
 *
 * Read access is granted by either the general `osquery-read` privilege
 * (scheduled results, action results) or the Live queries sub-feature's
 * `osquery-readLiveQueries` privilege. Both grant read access to results, so
 * this check accepts either one.
 */
export const hasOsqueryReadPrivilege = async (
  security: SecurityPluginStart,
  request: KibanaRequest
): Promise<boolean> => {
  if (!security.authz.mode.useRbacForRequest(request)) {
    return true;
  }

  const { privileges } = await security.authz.checkPrivilegesDynamicallyWithRequest(request)({
    kibana: [
      security.authz.actions.api.get(`${PLUGIN_ID}-read`),
      security.authz.actions.api.get(`${PLUGIN_ID}-readLiveQueries`),
    ],
  });

  return privileges.kibana.some(({ authorized }) => authorized);
};
