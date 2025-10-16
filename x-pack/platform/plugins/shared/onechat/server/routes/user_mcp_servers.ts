/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import type { IRouter } from '@kbn/core-http-server';
import { getHandlerWrapper } from './wrap_handler';
import { getCurrentSpaceId } from '../utils/spaces';
import { createUserMcpServerClient } from '../services/user_mcp/client';
import type { OnechatHandlerContext, OnechatSetupDependencies } from '../types';
import type { InternalStartServices } from '../services/types';
import { apiPrivileges } from '../../common/features';
import { USER_MCP_SERVER_SAVED_OBJECT_TYPE } from '../saved_objects/user_mcp_server';
import type { ISavedObjectsRepository } from '@kbn/core/server';

const authConfigSchema = schema.oneOf([
  schema.object({
    type: schema.literal('none'),
  }),
  schema.object({
    type: schema.literal('apiKey'),
    headers: schema.recordOf(schema.string(), schema.string()),
  }),
  schema.object({
    type: schema.literal('basicAuth'),
    username: schema.string(),
    password: schema.string(),
  }),
]);

const userMcpServerCreateSchema = schema.object({
  name: schema.string({ minLength: 1 }),
  description: schema.maybe(schema.string()),
  enabled: schema.boolean({ defaultValue: true }),
  type: schema.oneOf([schema.literal('http'), schema.literal('sse'), schema.literal('auto')], {
    defaultValue: 'auto',
  }),
  url: schema.uri({ scheme: ['http', 'https'] }),
  auth_type: schema.oneOf([
    schema.literal('none'),
    schema.literal('apiKey'),
    schema.literal('basicAuth'),
  ]),
  auth_config: authConfigSchema,
  options: schema.maybe(
    schema.object({
      timeout: schema.maybe(schema.number({ min: 1000, max: 300000 })),
      rejectUnauthorized: schema.maybe(schema.boolean()),
    })
  ),
});

const updateUserMcpServerSchema = schema.object({
  name: schema.maybe(schema.string({ minLength: 1 })),
  description: schema.maybe(schema.string()),
  enabled: schema.maybe(schema.boolean()),
  type: schema.maybe(
    schema.oneOf([schema.literal('http'), schema.literal('sse'), schema.literal('auto')])
  ),
  url: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
  auth_type: schema.maybe(
    schema.oneOf([schema.literal('none'), schema.literal('apiKey'), schema.literal('basicAuth')])
  ),
  auth_config: schema.maybe(authConfigSchema),
  options: schema.maybe(
    schema.object({
      timeout: schema.maybe(schema.number({ min: 1000, max: 300000 })),
      rejectUnauthorized: schema.maybe(schema.boolean()),
    })
  ),
});

export function registerUserMcpServerRoutes({
  router,
  logger,
  pluginsSetup,
  getInternalServices,
}: {
  router: IRouter<OnechatHandlerContext>;
  logger: Logger;
  pluginsSetup: OnechatSetupDependencies;
  getInternalServices: () => InternalStartServices;
}) {
  const wrapHandler = getHandlerWrapper(getInternalServices);

  // List all user MCP servers in current space
  router.get(
    {
      path: '/api/agent_builder/user_mcp_servers',
      validate: false,
      options: {
        access: 'internal',
      },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (context, request, response) => {
      try {
        logger.info('[user_mcp_servers] Listing MCP servers');
        const coreContext = await context.core;
        const spaceId = getCurrentSpaceId({
          request,
          spaces: pluginsSetup.spaces,
        });
        logger.info(`[user_mcp_servers] Space ID: ${spaceId}`);

        // Get saved objects client
        const savedObjectsRepository = coreContext.savedObjects
          .client as any as ISavedObjectsRepository;
        logger.info('[user_mcp_servers] Got saved objects client');

        const client = createUserMcpServerClient({
          savedObjectsRepository,
          spaceId,
          logger,
        });
        logger.info('[user_mcp_servers] Created client');

        const servers = await client.list();
        logger.info(`[user_mcp_servers] Found ${servers.length} servers`);
        return response.ok({ body: servers });
      } catch (error) {
        logger.error(`[user_mcp_servers] Error listing servers: ${error}`);
        logger.error(error);
        throw error;
      }
    })
  );

  // Get a specific user MCP server
  router.get(
    {
      path: '/api/agent_builder/user_mcp_servers/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: {
        access: 'internal',
      },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (context, request, response) => {
      const coreContext = await context.core;
      const spaceId = getCurrentSpaceId({
        request,
        spaces: pluginsSetup.spaces,
      });

      const savedObjectsRepository = coreContext.savedObjects
        .client as any as ISavedObjectsRepository;

      const client = createUserMcpServerClient({
        savedObjectsRepository,
        spaceId,
        logger,
      });

      try {
        const server = await client.get(request.params.id);
        return response.ok({ body: server });
      } catch (error) {
        if (error.output?.statusCode === 404) {
          return response.notFound({ body: { message: `Server ${request.params.id} not found` } });
        }
        throw error;
      }
    })
  );

  // Create a new user MCP server
  router.post(
    {
      path: '/api/agent_builder/user_mcp_servers',
      validate: {
        body: userMcpServerCreateSchema,
      },
      options: {
        access: 'internal',
      },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
    },
    wrapHandler(async (context, request, response) => {
      const coreContext = await context.core;
      const spaceId = getCurrentSpaceId({
        request,
        spaces: pluginsSetup.spaces,
      });

      const savedObjectsRepository = coreContext.savedObjects
        .client as any as ISavedObjectsRepository;

      const client = createUserMcpServerClient({
        savedObjectsRepository,
        spaceId,
        logger,
      });

      try {
        const server = await client.create(request.body);
        return response.ok({ body: server });
      } catch (error) {
        if (error.output?.statusCode === 409) {
          return response.conflict({
            body: { message: `Server with id ${request.body.id} already exists` },
          });
        }
        logger.error(`Error creating user MCP server: ${error}`);
        return response.customError({
          statusCode: 500,
          body: { message: `Failed to create MCP server: ${error.message}` },
        });
      }
    })
  );

  // Update an existing user MCP server
  router.put(
    {
      path: '/api/agent_builder/user_mcp_servers/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: updateUserMcpServerSchema,
      },
      options: {
        access: 'internal',
      },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
    },
    wrapHandler(async (context, request, response) => {
      const coreContext = await context.core;
      const spaceId = getCurrentSpaceId({
        request,
        spaces: pluginsSetup.spaces,
      });

      const savedObjectsRepository = coreContext.savedObjects
        .client as any as ISavedObjectsRepository;

      const client = createUserMcpServerClient({
        savedObjectsRepository,
        spaceId,
        logger,
      });

      try {
        logger.debug(
          `[user_mcp_servers] Update request body: ${JSON.stringify({
            ...request.body,
            auth_config: request.body.auth_config ? '***PRESENT***' : undefined,
          })}`
        );
        logger.debug(
          `[user_mcp_servers] auth_config in body: ${JSON.stringify(request.body.auth_config)}`
        );
        const server = await client.update(request.params.id, request.body);
        return response.ok({ body: server });
      } catch (error) {
        if (error.output?.statusCode === 404) {
          return response.notFound({ body: { message: `Server ${request.params.id} not found` } });
        }
        logger.error(`Error updating user MCP server: ${error}`);
        return response.customError({
          statusCode: 500,
          body: { message: `Failed to update MCP server: ${error.message}` },
        });
      }
    })
  );

  // Delete a user MCP server
  router.delete(
    {
      path: '/api/agent_builder/user_mcp_servers/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: {
        access: 'internal',
      },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
    },
    wrapHandler(async (context, request, response) => {
      const coreContext = await context.core;
      const spaceId = getCurrentSpaceId({
        request,
        spaces: pluginsSetup.spaces,
      });

      const savedObjectsRepository = coreContext.savedObjects
        .client as any as ISavedObjectsRepository;

      const client = createUserMcpServerClient({
        savedObjectsRepository,
        spaceId,
        logger,
      });

      try {
        await client.delete(request.params.id);
        return response.ok({ body: { success: true } });
      } catch (error) {
        if (error.output?.statusCode === 404) {
          return response.notFound({ body: { message: `Server ${request.params.id} not found` } });
        }
        logger.error(`Error deleting user MCP server: ${error}`);
        return response.customError({
          statusCode: 500,
          body: { message: `Failed to delete MCP server: ${error.message}` },
        });
      }
    })
  );

  // Test connection to a user MCP server
  router.post(
    {
      path: '/api/agent_builder/user_mcp_servers/{id}/_test',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: {
        access: 'internal',
      },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
    },
    wrapHandler(async (context, request, response) => {
      const coreContext = await context.core;
      const spaceId = getCurrentSpaceId({
        request,
        spaces: pluginsSetup.spaces,
      });

      const savedObjectsRepository = coreContext.savedObjects
        .client as any as ISavedObjectsRepository;

      const client = createUserMcpServerClient({
        savedObjectsRepository,
        spaceId,
        logger,
      });

      try {
        const server = await client.get(request.params.id);
        const services = getInternalServices();

        // Get userMcpConnectionManager from the setup deps
        // We need to access it through the tools service
        // For now, we'll do a simple connection test
        const { userMcp: userMcpConnectionManager } = services as any;

        if (!userMcpConnectionManager) {
          // Fallback: Try to connect using the connection manager
          const { UserMcpConnectionManager } = await import(
            '../services/user_mcp/connection_manager'
          );
          const tempManager = new UserMcpConnectionManager({ logger });
          await tempManager.connectToServer(server);
        } else {
          await userMcpConnectionManager.connectToServer(server);
        }

        return response.ok({ body: { success: true, message: 'Connection successful' } });
      } catch (error) {
        logger.error(`Error testing user MCP server connection: ${error}`);
        return response.ok({
          body: {
            success: false,
            error: error.message || 'Connection failed',
          },
        });
      }
    })
  );
}
