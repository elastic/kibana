/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { API_VERSIONS, CREATE_MANAGED_ECF_DEPLOYMENT_ROUTE } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';
import { agentlessAgentService } from '../../services/agents/agentless_agent';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

const boundedString = schema.string({ minLength: 1, maxLength: 2048 });

const requestSchema = {
  body: schema.object({
    policy_id: schema.string({ minLength: 1, maxLength: 256 }),
    managed_ecf: schema.object({
      input_type: schema.oneOf([schema.literal('cloudtrail'), schema.literal('crowdstrike_fdr')]),
      dataset: boundedString,
      interval: schema.oneOf([
        schema.literal('1m'),
        schema.literal('2m'),
        schema.literal('5m'),
        schema.literal('10m'),
      ]),
      region: boundedString,
      sqs_queue_url: boundedString,
      motel_endpoint: boundedString,
    }),
    managed_ecf_secrets: schema.object({
      aws_key: schema.maybe(schema.string({ maxLength: 2048 })),
      aws_secret: schema.maybe(schema.string({ maxLength: 2048 })),
      aws_token: schema.maybe(schema.string({ maxLength: 8192 })),
    }),
  }),
};

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      path: CREATE_MANAGED_ECF_DEPLOYMENT_ROUTE,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.INTEGRATIONS.ALL],
        },
      },
      summary: 'Create a managed ECF deployment (POC)',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: requestSchema },
      },
      async (context, request, response) => {
        const { elasticsearch } = await context.core;
        const esClient = elasticsearch.client.asCurrentUser;

        // Create a scoped OTel API key for the managed OTLP endpoint.
        // The key requires only application-level apm:event:write — no cluster or index
        // privileges (index-level descriptors cause PermissionDenied at the motel endpoint).
        const motelApiKey = await esClient.security.createApiKey({
          name: `agentless-motel-${request.body.policy_id}`,
          metadata: { managed: true },
          role_descriptors: {
            otlp_writer: {
              applications: [{ application: 'apm', resources: ['*'], privileges: ['event:write'] }],
            },
          },
        });

        const result = await agentlessAgentService.createManagedEcfDeployment({
          ...request.body,
          managed_ecf_secrets: {
            ...request.body.managed_ecf_secrets,
            motel_api_key: `${motelApiKey.id}:${motelApiKey.api_key}`,
          },
        });
        if (!result) {
          return response.customError({
            statusCode: 502,
            body: { message: 'Agentless API returned no response' },
          });
        }
        return response.ok({ body: result.data });
      }
    );
};
