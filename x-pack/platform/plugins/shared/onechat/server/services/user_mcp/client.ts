/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  ISavedObjectsRepository,
  SavedObjectsCreateOptions,
  SavedObjectsUpdateOptions,
} from '@kbn/core/server';
import {
  USER_MCP_SERVER_SAVED_OBJECT_TYPE,
  type UserMcpServerAttributes,
  type AuthConfig,
} from '../../saved_objects/user_mcp_server';
import { v4 as uuidv4 } from 'uuid';

export interface UserMcpServerCreateParams {
  name: string;
  description?: string;
  enabled: boolean;
  type: 'http' | 'sse' | 'auto';
  url: string;
  auth_type: 'none' | 'apiKey' | 'basicAuth';
  auth_config: AuthConfig;
  options?: {
    timeout?: number;
    rejectUnauthorized?: boolean;
  };
}

export interface UserMcpServerUpdateParams {
  name?: string;
  description?: string;
  enabled?: boolean;
  type?: 'http' | 'sse' | 'auto';
  url?: string;
  auth_type?: 'none' | 'apiKey' | 'basicAuth';
  auth_config?: AuthConfig;
  options?: {
    timeout?: number;
    rejectUnauthorized?: boolean;
  };
}

export interface UserMcpServer extends UserMcpServerAttributes {
  id: string;
}

export interface UserMcpServerClient {
  list(): Promise<UserMcpServer[]>;
  get(id: string): Promise<UserMcpServer>;
  create(params: UserMcpServerCreateParams): Promise<UserMcpServer>;
  update(id: string, params: UserMcpServerUpdateParams): Promise<UserMcpServer>;
  delete(id: string): Promise<boolean>;
}

export interface CreateUserMcpServerClientParams {
  savedObjectsRepository: ISavedObjectsRepository;
  spaceId: string;
  logger: Logger;
}

export const createUserMcpServerClient = ({
  savedObjectsRepository,
  spaceId,
  logger,
}: CreateUserMcpServerClientParams): UserMcpServerClient => {
  return {
    async list(): Promise<UserMcpServer[]> {
      try {
        const result = await savedObjectsRepository.find<UserMcpServerAttributes>({
          type: USER_MCP_SERVER_SAVED_OBJECT_TYPE,
          perPage: 10000,
        });

        logger.debug(
          `Raw saved objects from find: ${JSON.stringify(
            result.saved_objects.map((so) => ({ id: so.id, attributes: so.attributes }))
          )}`
        );

        const servers = result.saved_objects.map((so) => ({
          id: so.id,
          ...so.attributes,
        }));

        logger.debug(`Retrieved ${servers.length} user MCP servers from saved objects`);
        for (const server of servers) {
          logger.debug(
            `Server ${server.id}: auth_type=${server.auth_type}, auth_config=${JSON.stringify(
              server.auth_config
            )}`
          );
        }

        return servers;
      } catch (error) {
        logger.error(`Failed to list user MCP servers: ${error}`);
        throw error;
      }
    },

    async get(id: string): Promise<UserMcpServer> {
      try {
        const result = await savedObjectsRepository.get<UserMcpServerAttributes>(
          USER_MCP_SERVER_SAVED_OBJECT_TYPE,
          id
        );

        return {
          id: result.id,
          ...result.attributes,
        };
      } catch (error) {
        logger.error(`Failed to get user MCP server ${id}: ${error}`);
        throw error;
      }
    },

    async create(params: UserMcpServerCreateParams): Promise<UserMcpServer> {
      try {
        const now = new Date().toISOString();
        const attributes: UserMcpServerAttributes = {
          ...params,
          created_at: now,
          updated_at: now,
        };

        logger.debug(
          `Creating MCP server with attributes: ${JSON.stringify({
            ...attributes,
            auth_config: attributes.auth_config ? '***REDACTED***' : undefined,
          })}`
        );
        logger.debug(
          `auth_config type: ${attributes.auth_config?.type}, has credentials: ${
            !!(attributes.auth_config as any)?.username ||
            !!(attributes.auth_config as any)?.headers
          }`
        );

        // Generate a UUID for encrypted saved objects
        const id = uuidv4();

        const options: SavedObjectsCreateOptions = {
          id,
        };

        const result = await savedObjectsRepository.create<UserMcpServerAttributes>(
          USER_MCP_SERVER_SAVED_OBJECT_TYPE,
          attributes,
          options
        );

        logger.info(`Created user MCP server: ${result.id}`);
        logger.debug(
          `Result attributes: ${JSON.stringify({
            ...result.attributes,
            auth_config: result.attributes.auth_config ? '***REDACTED***' : undefined,
          })}`
        );

        return {
          id: result.id,
          ...result.attributes,
        };
      } catch (error) {
        logger.error(`Failed to create user MCP server: ${error}`);
        throw error;
      }
    },

    async update(id: string, params: UserMcpServerUpdateParams): Promise<UserMcpServer> {
      try {
        const now = new Date().toISOString();
        const attributes = {
          ...params,
          updated_at: now,
        };

        logger.debug(
          `Updating MCP server ${id} with attributes: ${JSON.stringify({
            ...attributes,
            auth_config: attributes.auth_config ? '***REDACTED***' : undefined,
          })}`
        );

        await savedObjectsRepository.update<Partial<UserMcpServerAttributes>>(
          USER_MCP_SERVER_SAVED_OBJECT_TYPE,
          id,
          attributes
        );

        logger.info(`Updated user MCP server: ${id}`);

        // Fetch and return the updated object
        return await this.get(id);
      } catch (error) {
        logger.error(`Failed to update user MCP server ${id}: ${error}`);
        throw error;
      }
    },

    async delete(id: string): Promise<boolean> {
      try {
        await savedObjectsRepository.delete(USER_MCP_SERVER_SAVED_OBJECT_TYPE, id);

        logger.info(`Deleted user MCP server: ${id}`);
        return true;
      } catch (error) {
        logger.error(`Failed to delete user MCP server ${id}: ${error}`);
        throw error;
      }
    },
  };
};
