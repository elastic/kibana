/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SearchConnectorsPluginSetupDependencies } from '../types';

export function registerApiKeysRoutes({ router }: SearchConnectorsPluginSetupDependencies) {
  router.get(
    {
      path: '/internal/content_connectors/api_keys',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {},
    },
    async (context, request, response) => {
      const core = await context.core;
      const { client } = core.elasticsearch;
      const user = core.security.authc.getCurrentUser();
      if (user) {
        try {
          const apiKeys = await client.asCurrentUser.security.getApiKey({
            username: user.username,
          });
          const validKeys = apiKeys.api_keys.filter(({ invalidated }) => !invalidated);
          return response.ok({ body: { api_keys: validKeys } });
        } catch {
          // Ideally we check the error response here for unauthorized user
          // Unfortunately the error response is not structured enough for us to filter those
          // Always returning an empty array should also be fine, and deals with transient errors

          return response.ok({ body: { api_keys: [] } });
        }
      }
      return response.customError({
        body: 'Could not retrieve current user, security plugin is not ready',
        statusCode: 502,
      });
    }
  );

  router.get(
    {
      path: '/internal/content_connectors/api_keys/{apiKeyId}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        params: schema.object({
          apiKeyId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const core = await context.core;
      const { client } = core.elasticsearch;
      const { apiKeyId } = request.params;
      const user = core.security.authc.getCurrentUser();

      if (user) {
        try {
          const apiKey = await client.asCurrentUser.security.getApiKey({ id: apiKeyId });
          return response.ok({ body: apiKey.api_keys[0] });
        } catch {
          // Ideally we check the error response here for unauthorized user
          // Unfortunately the error response is not structured enough for us to filter those
          // Always returning an empty array should also be fine, and deals with transient errors

          return response.ok({ body: { api_keys: [] } });
        }
      }
      return response.customError({
        body: 'Could not retrieve current user, security plugin is not ready',
        statusCode: 502,
      });
    }
  );

  router.post(
    {
      path: '/internal/content_connectors/api_keys',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {
        body: schema.any(),
      },
    },
    async (context, request, response) => {
      const { security: coreSecurity } = await context.core;
      const result = await coreSecurity.authc.apiKeys.create(request.body);
      if (result) {
        const apiKey = { ...result, beats_logstash_format: `${result.id}:${result.api_key}` };
        return response.ok({ body: apiKey });
      }
      return response.customError({
        body: 'Could not retrieve current user, security plugin is not ready',
        statusCode: 502,
      });
    }
  );
}
