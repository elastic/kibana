/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'node:path';

import { schema } from '@kbn/config-schema';

import {
  CreateAgentlessPolicyRequestSchema,
  CreateAgentlessPolicyResponseSchema,
  DeleteAgentlessPolicyRequestSchema,
  DeleteAgentlessPolicyResponseSchema,
} from '../../../common/types/rest_spec/agentless_policy';
import { AGENTLESS_POLICIES_ROUTES, API_VERSIONS } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import { genericErrorResponse } from '../schema/errors';

import {
  createAgentlessPolicyHandler,
  deleteAgentlessPolicyHandler,
  syncAgentlessPoliciesHandler,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      enableQueryVersion: true,
      path: AGENTLESS_POLICIES_ROUTES.SYNC_PATTERN,
      summary: 'Sync agentless policies',
      description: 'Sync agentless policies',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [
            FLEET_API_PRIVILEGES.FLEET.ALL,
            FLEET_API_PRIVILEGES.INTEGRATIONS.ALL,
          ],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: schema.object({
              dryRun: schema.boolean({
                defaultValue: false,
                meta: { description: 'If true, no changes are applied.' },
              }),
            }),
          },
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () =>
                schema.object({
                  success: schema.boolean({
                    meta: {
                      description: 'Indicates if the sync was successful.',
                    },
                  }),
                }),
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      syncAgentlessPoliciesHandler
    );

  // Create
  router.versioned
    // @ts-ignore https://github.com/elastic/kibana/issues/203170
    .post({
      path: AGENTLESS_POLICIES_ROUTES.CREATE_PATTERN,
      summary: 'Create an agentless policy',
      description: 'Create an agentless policy',
      options: {
        tags: ['oas-tag:Fleet agentless policies'],
        availability: {
          since: '9.3.0',
          stability: 'experimental',
        },
      },
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/create_agentless_policies.yaml'),
        },
        validate: {
          request: CreateAgentlessPolicyRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => CreateAgentlessPolicyResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
            409: {
              description: 'A conflict occurred.',
              body: genericErrorResponse,
            },
          },
        },
      },
      createAgentlessPolicyHandler
    );

  // Delete
  router.versioned
    // @ts-ignore https://github.com/elastic/kibana/issues/203170
    .delete({
      path: AGENTLESS_POLICIES_ROUTES.DELETE_PATTERN,
      summary: 'Delete an agentless policy',
      description: 'Delete an agentless policy',
      options: {
        tags: ['oas-tag:Fleet agentless policies'],
        availability: {
          since: '9.3.0',
          stability: 'experimental',
        },
      },
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/delete_agentless_policies.yaml'),
        },
        validate: {
          request: DeleteAgentlessPolicyRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => DeleteAgentlessPolicyResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
            409: {
              description: 'A conflict occurred.',
              body: genericErrorResponse,
            },
          },
        },
      },
      deleteAgentlessPolicyHandler
    );
};
