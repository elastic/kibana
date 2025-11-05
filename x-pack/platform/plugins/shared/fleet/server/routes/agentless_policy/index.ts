/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateAgentlessPolicyRequestSchema } from '../../../common/types/rest_spec/agentless_policy';
import { AGENTLESS_POLICIES_ROUTES, API_VERSIONS } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';
import { CreatePackagePolicyResponseSchema } from '../../types';
import { genericErrorResponse } from '../schema/errors';

import { createAgentlessPolicyHandler } from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // Create
  router.versioned
    .post({
      path: AGENTLESS_POLICIES_ROUTES.CREATE_PATTERN,
      summary: 'Create an agentless policy',
      options: {
        tags: ['oas-tag:Fleet agentless policies'],
      },
      // TODO add security
      security: {
        authz: {
          enabled: false,
          reason: 'TODO add security',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: CreateAgentlessPolicyRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => CreatePackagePolicyResponseSchema, // TODO
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
};
