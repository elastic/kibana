/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Type, schema } from '@kbn/config-schema';
import {
  CallToolRequest,
  MCPConnectorConfig,
  MCPConnectorSecrets,
  MCPConnectorSecretsAPIKey,
  MCPConnectorSecretsBasicAuth,
  MCPCallToolParams,
  MCPListToolsParams,
  MCPConnectorHTTPServiceConfig,
  MCP_CONNECTOR_AUTH_TYPE_NONE,
  MCP_CONNECTOR_AUTH_TYPE_API_KEY,
  MCP_CONNECTOR_AUTH_TYPE_BASIC,
  MCPConnectorSecretsNoAuth,
} from '@kbn/mcp-connector-common';

export const MCPConnectorHTTPServiceConfigSchema: Type<MCPConnectorHTTPServiceConfig> =
  schema.object({
    http: schema.object({
      url: schema.string(),
    }),
    authType: schema.oneOf([
      schema.literal(MCP_CONNECTOR_AUTH_TYPE_NONE),
      schema.literal(MCP_CONNECTOR_AUTH_TYPE_BASIC),
      schema.literal(MCP_CONNECTOR_AUTH_TYPE_API_KEY),
    ]),
  });

export const MCPConnectorConfigSchema: Type<MCPConnectorConfig> = schema.allOf([
  schema.object({
    version: schema.maybe(schema.string()),
    service: schema.oneOf([MCPConnectorHTTPServiceConfigSchema]),
  }),
]);

export const MCPConnectorSecretsNoAuthSchema: Type<MCPConnectorSecretsNoAuth> = schema.object({});

export const MCPConnectorSecretsAPIKeySchema: Type<MCPConnectorSecretsAPIKey> = schema.object({
  auth: schema.object({
    apiKey: schema.string(),
  }),
});

export const MCPConnectorSecretsBasicAuthSchema: Type<MCPConnectorSecretsBasicAuth> = schema.object(
  {
    auth: schema.object({
      username: schema.string(),
      password: schema.string(),
    }),
  }
);

export const MCPConnectorSecretsSchema: Type<MCPConnectorSecrets> = schema.oneOf([
  MCPConnectorSecretsAPIKeySchema,
  MCPConnectorSecretsBasicAuthSchema,
  MCPConnectorSecretsNoAuthSchema,
]);

const MCPListToolsParamsSchema: Type<MCPListToolsParams> = schema.object({
  subAction: schema.literal('listTools'),
  subActionParams: schema.object({}),
});

const MCPCallToolParamsSchema: Type<MCPCallToolParams> = schema.object({
  subAction: schema.literal('callTool'),
  subActionParams: schema.object({
    name: schema.string(),
    arguments: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  }) satisfies Type<CallToolRequest>,
});

export const MCPExecutorParamsSchema: Type<MCPCallToolParams | MCPListToolsParams> = schema.oneOf([
  MCPListToolsParamsSchema,
  MCPCallToolParamsSchema,
]);
