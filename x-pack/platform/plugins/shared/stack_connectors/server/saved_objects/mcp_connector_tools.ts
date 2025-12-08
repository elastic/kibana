/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

export const MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE = 'mcp-connector-tools';

export interface McpConnectorToolsAttributes {
  connectorId: string;
  tools: Array<{
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
    provider?: {
      id: string;
      name: string;
      type: string;
      uniqueId: string;
      description?: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export const mcpConnectorToolsType: SavedObjectsType<McpConnectorToolsAttributes> = {
  name: MCP_CONNECTOR_TOOLS_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      connectorId: {
        type: 'keyword',
      },
      tools: {
        type: 'object',
        enabled: false,
      },
      createdAt: {
        type: 'date',
      },
      updatedAt: {
        type: 'date',
      },
    },
  },
  modelVersions: {
    '1': {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            connectorId: {
              type: 'keyword',
            },
            tools: {
              type: 'object',
              enabled: false,
            },
            createdAt: {
              type: 'date',
            },
            updatedAt: {
              type: 'date',
            },
          },
        },
      ],
    },
  },
};
