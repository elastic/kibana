/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { API_VERSIONS } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import { APP_API_ROUTES } from '../../constants';
import { PostHealthCheckRequestSchema, PostHealthCheckResponseSchema } from '../../types';
import { genericErrorResponse } from '../schema/errors';

import { postHealthCheckHandler } from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // get fleet server health check by host id
  router.versioned
    .post({
      path: APP_API_ROUTES.HEALTH_CHECK_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.SETTINGS.ALL],
        },
      },
      summary: `Check Fleet Server health`,
      description:
        'Check the health status of a Fleet Server instance by its host ID. Returns the server status and name if available.',
      options: {
        tags: ['oas-tag:Fleet internals'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/post_health_check.yaml'),
        },
        validate: {
          request: PostHealthCheckRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => PostHealthCheckResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
            404: {
              description: 'Not found.',
              body: genericErrorResponse,
            },
          },
        },
      },
      postHealthCheckHandler
    );
};
