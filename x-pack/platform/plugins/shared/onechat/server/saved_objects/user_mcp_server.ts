/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

export const USER_MCP_SERVER_SAVED_OBJECT_TYPE = 'onechat_user_mcp_server';

export const userMcpServerSavedObjectType: SavedObjectsType = {
  name: USER_MCP_SERVER_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple', // Per-space isolation
  mappings: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
      },
      description: {
        type: 'text',
      },
      enabled: {
        type: 'boolean',
      },
      type: {
        type: 'keyword', // 'http' | 'sse' | 'auto'
      },
      url: {
        type: 'keyword',
      },
      auth_type: {
        type: 'keyword', // 'none' | 'apiKey' | 'basicAuth'
      },
      // Auth config stored as object (ES encryption at rest should be enabled)
      auth_config: {
        type: 'object',
        enabled: false,
      },
      options: {
        type: 'object',
        enabled: false,
      },
      created_at: {
        type: 'date',
      },
      updated_at: {
        type: 'date',
      },
    },
  },
  management: {
    displayName: 'User MCP Server',
    importableAndExportable: true,
    getTitle: (obj) => obj.attributes.name || obj.id,
  },
};

export interface UserMcpServerAttributes {
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
  created_at: string;
  updated_at: string;
}

export type AuthConfig =
  | { type: 'none' }
  | { type: 'apiKey'; headers: Record<string, string> }
  | { type: 'basicAuth'; username: string; password: string };
