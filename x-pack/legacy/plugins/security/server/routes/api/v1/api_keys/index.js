/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getClient } from '../../../../../../../server/lib/get_client_shield';
import { routePreCheckLicense } from '../../../../lib/route_pre_check_license';
import { initCheckPrivilegesApi } from './privileges';
import { initGetApiKeysApi } from './get';
import { initInvalidateApiKeysApi } from './invalidate';

export function initApiKeysApi(server) {
  const callWithRequest = getClient(server).callWithRequest;
  const routePreCheckLicenseFn = routePreCheckLicense(server);

  const { authorization } = server.plugins.security;
  const { application } = authorization;

  initCheckPrivilegesApi(server, callWithRequest, routePreCheckLicenseFn, application);
  initGetApiKeysApi(server, callWithRequest, routePreCheckLicenseFn, application);
  initInvalidateApiKeysApi(server, callWithRequest, routePreCheckLicenseFn, application);
}
