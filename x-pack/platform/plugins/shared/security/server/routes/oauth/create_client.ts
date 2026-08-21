/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiamOAuthProjectType } from '@kbn/core-security-server';
import {
  KIBANA_OBSERVABILITY_SOLUTION,
  KIBANA_SEARCH_SOLUTION,
  KIBANA_SECURITY_SOLUTION,
  KIBANA_VECTORDB_SOLUTION,
  type KibanaSolution,
} from '@kbn/projects-solutions-groups';

import { getConfiguredOAuthResources } from './list_resources';
import { createClientBodySchema } from './schemas';
import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

const KIBANA_SOLUTION_TO_UIAM_PROJECT_TYPE: Partial<Record<KibanaSolution, UiamOAuthProjectType>> =
  {
    [KIBANA_SEARCH_SOLUTION]: 'elasticsearch',
    [KIBANA_OBSERVABILITY_SOLUTION]: 'observability',
    [KIBANA_SECURITY_SOLUTION]: 'security',
    [KIBANA_VECTORDB_SOLUTION]: 'vectordb',
  };

export function defineCreateOAuthClientRoute({
  router,
  config,
  getAuthenticationService,
  serverlessProjectId,
  serverlessProjectType,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/oauth/clients',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the upstream UIAM service via the forwarded access token',
        },
      },
      validate: {
        body: createClientBodySchema,
      },
      options: {
        access: 'internal',
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const { oauth } = getAuthenticationService();
        if (!oauth) {
          return response.notFound({
            body: { message: 'OAuth management is not available: UIAM is not configured' },
          });
        }

        const configuredResources = getConfiguredOAuthResources(config);
        if (!configuredResources) {
          return response.notFound({
            body: {
              message:
                'OAuth management is not available: MCP protected resource metadata is not configured',
            },
          });
        }
        const { resource: requestedResource, ...clientBody } = request.body;
        const allowedValues = configuredResources.map((r) => r.value);
        const resource = requestedResource ?? allowedValues[0];
        if (!allowedValues.includes(resource)) {
          return response.badRequest({
            body: { message: `Invalid resource. Allowed values: ${allowedValues.join(', ')}` },
          });
        }

        if (!serverlessProjectId) {
          return response.notFound({
            body: {
              message: 'OAuth management is not available: serverless project id is not configured',
            },
          });
        }

        if (!serverlessProjectType) {
          return response.notFound({
            body: {
              message:
                'OAuth management is not available: serverless project type is not configured',
            },
          });
        }

        const projectType = KIBANA_SOLUTION_TO_UIAM_PROJECT_TYPE[serverlessProjectType];
        if (!projectType) {
          return response.notFound({
            body: {
              message:
                'OAuth management is not available: serverless project type is not supported',
            },
          });
        }

        const result = await oauth.createClient(request, {
          ...clientBody,
          resource,
          project_id: serverlessProjectId,
          project_type: projectType,
        });
        if (!result) {
          return response.notFound({
            body: {
              message: 'OAuth management is not available: security features are disabled',
            },
          });
        }

        return response.ok({ body: result });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
