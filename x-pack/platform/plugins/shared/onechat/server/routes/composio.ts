/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { apiPrivileges } from '../../common/features';

export const registerComposioRoutes = ({ router, getInternalServices }: RouteDependencies) => {
  const wrapHandler = getHandlerWrapper(getInternalServices);

  /**
   * Get OAuth configuration for a Composio toolkit
   */
  router.get(
    {
      path: '/internal/onechat/composio/toolkits/{toolkitId}/oauth_config',
      validate: {
        params: schema.object({
          toolkitId: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { toolkitId } = request.params;
      const services = getInternalServices();

      if (!services.composio) {
        return response.notFound({
          body: { message: 'Composio integration is not configured' },
        });
      }

      const config = services.composio.getToolkitConfig(toolkitId);

      if (!config) {
        return response.notFound({
          body: { message: `Toolkit not found: ${toolkitId}` },
        });
      }

      // Return only public OAuth config
      return response.ok({
        body: {
          toolkitId: config.id,
          toolkitName: config.name,
          authConfigId: config.authConfigId,
        },
      });
    })
  );

  /**
   * Initiate OAuth connection for a user to a Composio toolkit
   */
  router.post(
    {
      path: '/internal/onechat/composio/connection/initiate',
      validate: {
        body: schema.object({
          toolkitId: schema.string(),
          callbackUrl: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { toolkitId, callbackUrl } = request.body;
      const services = getInternalServices();

      if (!services.composio) {
        return response.notFound({
          body: { message: 'Composio integration is not configured' },
        });
      }

      try {
        // Get Kibana user ID from request
        const kibanaUserId = getUserIdFromRequest(request);

        if (!kibanaUserId) {
          return response.unauthorized({
            body: { message: 'User authentication required' },
          });
        }

        // Get or create Composio user ID
        const composioUserId = await services.composio.getOrCreateComposioUserId(kibanaUserId);

        // Create connection with callback URL
        const connection = await services.composio.createConnection(
          composioUserId,
          toolkitId,
          callbackUrl
        );

        return response.ok({
          body: {
            connectionId: connection.connectionId,
            redirectUrl: connection.redirectUrl,
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: `Failed to initiate connection: ${(error as Error).message}` },
        });
      }
    })
  );

  /**
   * Wait for Composio connection to be established
   * Called after OAuth redirect with the connected_account_id from Composio
   */
  router.post(
    {
      path: '/internal/onechat/composio/connection/wait',
      validate: {
        body: schema.object({
          connectedAccountId: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { connectedAccountId } = request.body;
      const services = getInternalServices();

      if (!services.composio) {
        return response.notFound({
          body: { message: 'Composio integration is not configured' },
        });
      }

      try {
        const connection = await services.composio.waitForConnection(connectedAccountId);

        return response.ok({
          body: {
            connectionId: connection.id,
            status: connection.status,
            appName: connection.appName,
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to wait for connection: ${(error as Error).message}`,
          },
        });
      }
    })
  );

  /**
   * Check connection status for a user and toolkit
   */
  router.get(
    {
      path: '/internal/onechat/composio/connection/status',
      validate: {
        query: schema.object({
          toolkitId: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { toolkitId } = request.query;
      const services = getInternalServices();

      if (!services.composio) {
        return response.notFound({
          body: { message: 'Composio integration is not configured' },
        });
      }

      try {
        // Get Kibana user ID from request
        const kibanaUserId = getUserIdFromRequest(request);

        if (!kibanaUserId) {
          return response.unauthorized({
            body: { message: 'User authentication required' },
          });
        }

        // Get Composio user ID
        const composioUserId = await services.composio.getOrCreateComposioUserId(kibanaUserId);

        // Check connection status
        const isConnected = await services.composio.checkConnectionStatus(
          composioUserId,
          toolkitId
        );

        return response.ok({
          body: {
            toolkitId,
            isConnected,
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to check connection status: ${(error as Error).message}`,
          },
        });
      }
    })
  );
};

/**
 * Extract user ID from request
 */
function getUserIdFromRequest(request: any): string | undefined {
  if (request.auth?.credentials?.username) {
    return request.auth.credentials.username;
  }
  if (request.auth?.credentials?.email) {
    return request.auth.credentials.email;
  }
  // Fallback for development
  return 'anonymous';
}
