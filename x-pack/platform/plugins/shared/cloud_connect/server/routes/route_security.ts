/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import { ApiPrivileges } from '@kbn/core-security-server';
import { CLOUD_CONNECTED_FEATURE_ID } from '../features';

/**
 * Applied to routes that only need to view Cloud Connect state, e.g. reading
 * cluster/service details. Satisfied by either the `read` or `all` Kibana privilege.
 */
export const CLOUD_CONNECT_READ_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [ApiPrivileges.read(CLOUD_CONNECTED_FEATURE_ID)],
  },
};

/**
 * Applied to routes that configure or mutate Cloud Connect state, e.g. onboarding,
 * updating services, rotating keys, or disconnecting the cluster. Only satisfied by
 * the `all` Kibana privilege.
 */
export const CLOUD_CONNECT_MANAGE_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [ApiPrivileges.manage(CLOUD_CONNECTED_FEATURE_ID)],
  },
};
