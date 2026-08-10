/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import {
  createAlertEventDataSchema,
  createAlertEventResponseSchema,
  errorResponseSchema,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';

export const createAlertEventRouteSecurity: RouteSecurity = {
  authz: {
    requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.alerts.write],
  },
};

export const createAlertEventRouteOptions = {
  summary: 'Create an alert event',
  description:
    'Creates an alert event directly without a backing rule. ' +
    'Intended for external monitoring systems pushing pre-normalized alerts.',
} as const;

export const createAlertEventRouteSchemas = {
  request: {
    body: createAlertEventDataSchema,
  },
  response: {
    201: {
      body: () => createAlertEventResponseSchema,
      description: 'Indicates a successful call.',
    },
    400: {
      body: () => errorResponseSchema,
      description: 'Indicates an invalid schema or parameters.',
    },
  },
};
