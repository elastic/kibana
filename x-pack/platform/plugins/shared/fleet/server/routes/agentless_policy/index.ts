/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'node:path';

import {
  CreateAgentlessPolicyRequestSchema,
  CreateAgentlessPolicyResponseSchema,
  DeleteAgentlessPolicyRequestSchema,
  DeleteAgentlessPolicyResponseSchema,
} from '../../../common/types/rest_spec/agentless_policy';
import { AGENTLESS_POLICIES_ROUTES, API_VERSIONS } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';

import { genericErrorResponse } from '../schema/errors';

import { createAgentlessPolicyHandler, deleteAgentlessPolicyHandler } from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
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
