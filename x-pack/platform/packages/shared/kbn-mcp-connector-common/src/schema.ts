/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

/**
 * Schema for MCP connector HTTP service configuration.
 *
 * Contains only non-sensitive metadata. Credentials are validated separately
 * via MCPConnectorSecretsSchema.
 */
export const MCPConnectorHTTPServiceConfigSchema = schema.object({
  http: schema.object({
    url: schema.string(),
  }),
  /**
   * Authentication type selector (required).
   *
   * Determines which authentication method to use. The actual credentials
   * are stored in the secrets object and must match this type.
   */
  authType: schema.oneOf([
    schema.literal('none'),
    schema.literal('bearer'),
    schema.literal('apiKey'),
    schema.literal('basic'),
    schema.literal('customHeaders'),
  ]),
  /**
   * Optional custom header name for API key authentication.
   *
   * Only used when authType is 'apiKey'. Defaults to 'X-API-Key' if not specified.
   */
  apiKeyHeaderName: schema.maybe(schema.string({ minLength: 1 })),
});

/**
 * Schema for MCP connector configuration.
 *
 * Top-level configuration object containing only non-sensitive metadata.
 */
export const MCPConnectorConfigSchema = schema.object({
  uniqueId: schema.maybe(schema.string({ minLength: 1 })),
  description: schema.maybe(schema.string()),
  version: schema.maybe(schema.string()),
  service: MCPConnectorHTTPServiceConfigSchema,
});

/**
 * Schema for no authentication secrets.
 *
 * Used when authType is 'none'.
 */
export const MCPConnectorSecretsNoneSchema = schema.object({
  authType: schema.literal('none'),
});

/**
 * Schema for Bearer token authentication secrets.
 *
 * Used when authType is 'bearer'.
 */
export const MCPConnectorSecretsBearerSchema = schema.object({
  authType: schema.literal('bearer'),
  token: schema.string({ minLength: 1 }),
});

/**
 * Schema for API key authentication secrets.
 *
 * Used when authType is 'apiKey'.
 */
export const MCPConnectorSecretsApiKeySchema = schema.object({
  authType: schema.literal('apiKey'),
  apiKey: schema.string({ minLength: 1 }),
});

/**
 * Schema for Basic authentication secrets.
 *
 * Used when authType is 'basic'.
 */
export const MCPConnectorSecretsBasicSchema = schema.object({
  authType: schema.literal('basic'),
  username: schema.string({ minLength: 1 }),
  password: schema.string({ minLength: 1 }),
});

/**
 * Schema for custom headers authentication secrets.
 *
 * Used when authType is 'customHeaders'.
 */
export const MCPConnectorSecretsCustomHeadersSchema = schema.object({
  authType: schema.literal('customHeaders'),
  headers: schema.arrayOf(
    schema.object({
      name: schema.string({ minLength: 1 }),
      value: schema.string(),
    }),
    { minSize: 1 }
  ),
});

/**
 * Schema for MCP connector secrets.
 *
 * Discriminated union that validates credentials based on authType.
 * The authType discriminator must match config.service.authType.
 */
export const MCPConnectorSecretsSchema = schema.oneOf([
  MCPConnectorSecretsNoneSchema,
  MCPConnectorSecretsBearerSchema,
  MCPConnectorSecretsApiKeySchema,
  MCPConnectorSecretsBasicSchema,
  MCPConnectorSecretsCustomHeadersSchema,
]);

const MCPListToolsParamsSchema = schema.object({
  subAction: schema.literal('listTools'),
  subActionParams: schema.object({}),
});

const MCPCallToolParamsSchema = schema.object({
  subAction: schema.literal('callTool'),
  subActionParams: schema.object({
    name: schema.string(),
    arguments: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  }),
});

export const MCPExecutorParamsSchema = schema.oneOf([
  MCPListToolsParamsSchema,
  MCPCallToolParamsSchema,
]);
