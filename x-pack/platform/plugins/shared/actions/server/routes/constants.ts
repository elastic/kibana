/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core-http-server';

/**
 * This constant is used as the default value for the security object in routes
 * where a reason for opting out needs to be provided.
 */
export const DEFAULT_ACTION_ROUTE_SECURITY: RouteSecurity = {
  authz: {
    enabled: false,
    reason:
      'This route is opted out from authorization because actions use their own authorization model inside the actions client.',
  },
};
