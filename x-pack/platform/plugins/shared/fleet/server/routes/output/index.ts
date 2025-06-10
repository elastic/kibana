/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import { OUTPUT_API_ROUTES } from '../../constants';
import {
  DeleteOutputRequestSchema,
  DeleteOutputResponseSchema,
  GenerateLogstashApiKeyResponseSchema,
  GetLatestOutputHealthRequestSchema,
  GetLatestOutputHealthResponseSchema,
  GetOneOutputRequestSchema,
  GetOutputsRequestSchema,
  GetOutputsResponseSchema,
  OutputResponseSchema,
  PostOutputRequestSchema,
  PutOutputRequestSchema,
} from '../../types';

import { genericErrorResponse } from '../schema/errors';

import {
  deleteOutputHandler,
  getOneOutputHandler,
  getOutputsHandler,
  postOutputHandler,
  putOutputHandler,
  postLogstashApiKeyHandler,
  getLatestOutputHealth,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .get({
      path: OUTPUT_API_ROUTES.LIST_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [
                FLEET_API_PRIVILEGES.SETTINGS.READ,
                FLEET_API_PRIVILEGES.AGENT_POLICIES.READ,
              ],
            },
          ],
        },
      },
      summary: 'Get outputs',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOutputsRequestSchema,
          response: {
            200: {
              body: () => GetOutputsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getOutputsHandler
    );
  router.versioned
    .get({
      path: OUTPUT_API_ROUTES.INFO_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [
                FLEET_API_PRIVILEGES.SETTINGS.READ,
                FLEET_API_PRIVILEGES.AGENT_POLICIES.READ,
              ],
            },
          ],
        },
      },
      summary: 'Get output',
      description: 'Get output by ID.',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOneOutputRequestSchema,
          response: {
            200: {
              body: () => OutputResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getOneOutputHandler
    );
  router.versioned
    .put({
      path: OUTPUT_API_ROUTES.UPDATE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [
                FLEET_API_PRIVILEGES.SETTINGS.ALL,
                FLEET_API_PRIVILEGES.AGENT_POLICIES.ALL,
              ],
            },
          ],
        },
      },
      summary: 'Update output',
      description: 'Update output by ID.',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PutOutputRequestSchema,
          response: {
            200: {
              body: () => OutputResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      putOutputHandler
    );

  router.versioned
    .post({
      path: OUTPUT_API_ROUTES.CREATE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.SETTINGS.ALL],
        },
      },
      summary: 'Create output',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostOutputRequestSchema,
          response: {
            200: {
              body: () => OutputResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      postOutputHandler
    );

  router.versioned
    .delete({
      path: OUTPUT_API_ROUTES.DELETE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.SETTINGS.ALL],
        },
      },
      summary: 'Delete output',
      description: 'Delete output by ID.',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeleteOutputRequestSchema,
          response: {
            200: {
              body: () => DeleteOutputResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
            404: {
              body: genericErrorResponse,
            },
          },
        },
      },
      deleteOutputHandler
    );

  router.versioned
    .post({
      path: OUTPUT_API_ROUTES.LOGSTASH_API_KEY_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.SETTINGS.ALL],
        },
      },
      summary: 'Generate a Logstash API key',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              body: () => GenerateLogstashApiKeyResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      postLogstashApiKeyHandler
    );

  router.versioned
    .get({
      path: OUTPUT_API_ROUTES.GET_OUTPUT_HEALTH_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.SETTINGS.READ],
        },
      },
      summary: 'Get the latest output health',
      options: {
        tags: ['oas-tag:Fleet outputs'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetLatestOutputHealthRequestSchema,
          response: {
            200: {
              body: () => GetLatestOutputHealthResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getLatestOutputHealth
    );
};
