/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';

import { FLEET_SERVER_HOST_API_ROUTES } from '../../../common/constants';
import {
  FleetServerHostResponseSchema,
  FleetServerHostSchema,
  GetAllFleetServerHostRequestSchema,
  GetOneFleetServerHostRequestSchema,
  PostFleetServerHostRequestSchema,
  PutFleetServerHostRequestSchema,
} from '../../types';

import { genericErrorResponse } from '../schema/errors';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import { ListResponseSchema } from '../schema/utils';

import {
  deleteFleetServerHostHandler,
  getAllFleetServerHostsHandler,
  getFleetServerHostHandler,
  postFleetServerHost,
  putFleetServerHostHandler,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .get({
      path: FLEET_SERVER_HOST_API_ROUTES.LIST_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [FLEET_API_PRIVILEGES.AGENTS.ALL, FLEET_API_PRIVILEGES.SETTINGS.READ],
            },
          ],
        },
      },
      summary: `Get Fleet Server hosts`,
      options: {
        tags: ['oas-tag:Fleet Server hosts'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetAllFleetServerHostRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => ListResponseSchema(FleetServerHostSchema),
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getAllFleetServerHostsHandler
    );
  router.versioned
    .post({
      path: FLEET_SERVER_HOST_API_ROUTES.CREATE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.SETTINGS.ALL],
        },
      },
      summary: `Create a Fleet Server host`,
      options: {
        tags: ['oas-tag:Fleet Server hosts'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostFleetServerHostRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => FleetServerHostResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      postFleetServerHost
    );
  router.versioned
    .get({
      path: FLEET_SERVER_HOST_API_ROUTES.INFO_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.SETTINGS.READ],
        },
      },
      summary: `Get a Fleet Server host`,
      description: `Get a Fleet Server host by ID.`,
      options: {
        tags: ['oas-tag:Fleet Server hosts'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOneFleetServerHostRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => FleetServerHostResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getFleetServerHostHandler
    );
  router.versioned
    .delete({
      path: FLEET_SERVER_HOST_API_ROUTES.DELETE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.SETTINGS.ALL],
        },
      },
      summary: `Delete a Fleet Server host`,
      description: `Delete a Fleet Server host by ID.`,
      options: {
        tags: ['oas-tag:Fleet Server hosts'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOneFleetServerHostRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () =>
                schema.object({
                  id: schema.string(),
                }),
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      deleteFleetServerHostHandler
    );
  router.versioned
    .put({
      path: FLEET_SERVER_HOST_API_ROUTES.UPDATE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.SETTINGS.ALL],
        },
      },
      summary: `Update a Fleet Server host`,
      description: `Update a Fleet Server host by ID.`,
      options: {
        tags: ['oas-tag:Fleet Server hosts'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PutFleetServerHostRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => FleetServerHostResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      putFleetServerHostHandler
    );
};
