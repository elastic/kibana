/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteConfigOptions, RouteMethod } from '@kbn/core-http-server';
import type { ErrorResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../lib/errors/error_codes';

type OASOperationObject = Exclude<
  Awaited<ReturnType<NonNullable<RouteConfigOptions<RouteMethod>['oasOperationObject']>>>,
  string
>;

const jsonExample = (name: string, summary: string, value: ErrorResponse) => ({
  content: {
    'application/json': {
      examples: {
        [name]: {
          summary,
          value,
        },
      },
    },
  },
});

/** Shared 401/403/500/503 OAS examples for all alerting v2 routes. */
export const getCommonErrorOasOperationObject = (): OASOperationObject => ({
  responses: {
    401: jsonExample('unauthorized', 'Request was not authenticated', {
      code: 'UNAUTHORIZED',
      error: 'Unauthorized',
      message: 'Authentication required to access this API.',
    }),
    403: jsonExample('forbidden', 'Caller lacks required privileges', {
      code: 'FORBIDDEN',
      error: 'Forbidden',
      message: 'The current user does not have the required privileges for this request.',
    }),
    500: jsonExample('internalServerError', 'Unexpected server-side error', {
      code: ALERTING_ERROR_CODES.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred.',
    }),
    503: jsonExample('alertingDisabled', 'Alerting engine is disabled', {
      code: ALERTING_ERROR_CODES.ALERTING_DISABLED,
      error: 'Service Unavailable',
      message: 'Alerting is disabled.',
    }),
  },
});
