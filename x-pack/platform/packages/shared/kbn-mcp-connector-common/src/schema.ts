/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

/**
 * Schema for MCP connector HTTP service configuration.
 *
 * Contains only non-sensitive metadata. Credentials are validated separately
 * via MCPConnectorSecretsSchema.
 */
export const MCPConnectorHTTPServiceConfigSchema = z.object({
  http: z.object({
    url: z.string(),
  }),
  /**
   * Authentication type selector (required).
   *
   * Determines which authentication method to use. The actual credentials
   * are stored in the secrets object and must match this type.
   */
  authType: z.union([
    z.literal('none'),
    z.literal('bearer'),
    z.literal('apiKey'),
    z.literal('basic'),
    z.literal('customHeaders'),
  ]),
  /**
   * Optional custom header name for API key authentication.
   *
   * Only used when authType is 'apiKey'. Defaults to 'X-API-Key' if not specified.
   */
  apiKeyHeaderName: z.string().min(1).optional(),
});

/**
 * Schema for MCP connector configuration.
 *
 * Top-level configuration object containing only non-sensitive metadata.
 */
export const MCPConnectorConfigSchema = z.object({
  uniqueId: z.string().min(1).optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  service: MCPConnectorHTTPServiceConfigSchema,
});

/**
 * Schema for no authentication secrets.
 *
 * Used when authType is 'none'.
 */
export const MCPConnectorSecretsNoneSchema = z.object({
  authType: z.literal('none'),
});

/**
 * Schema for Bearer token authentication secrets.
 *
 * Used when authType is 'bearer'.
 */
export const MCPConnectorSecretsBearerSchema = z.object({
  authType: z.literal('bearer'),
  token: z.string().min(1),
});

/**
 * Schema for API key authentication secrets.
 *
 * Used when authType is 'apiKey'.
 */
export const MCPConnectorSecretsApiKeySchema = z.object({
  authType: z.literal('apiKey'),
  apiKey: z.string().min(1),
});

/**
 * Schema for Basic authentication secrets.
 *
 * Used when authType is 'basic'.
 */
export const MCPConnectorSecretsBasicSchema = z.object({
  authType: z.literal('basic'),
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Schema for custom headers authentication secrets.
 *
 * Used when authType is 'customHeaders'.
 */
export const MCPConnectorSecretsCustomHeadersSchema = z.object({
  authType: z.literal('customHeaders'),
  headers: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.string(),
      })
    )
    .min(1),
});

/**
 * Schema for MCP connector secrets.
 *
 * Discriminated union that validates credentials based on authType.
 * The authType discriminator must match config.service.authType.
 */
export const MCPConnectorSecretsSchema = z.union([
  MCPConnectorSecretsNoneSchema,
  MCPConnectorSecretsBearerSchema,
  MCPConnectorSecretsApiKeySchema,
  MCPConnectorSecretsBasicSchema,
  MCPConnectorSecretsCustomHeadersSchema,
]);

export const ListToolsRequestSchema = z.object({
  forceRefresh: z.boolean().optional(),
});

const MCPListToolsParamsSchema = z.object({
  subAction: z.literal('listTools'),
  subActionParams: ListToolsRequestSchema,
});

// Schema for just the CallToolRequest params
export const CallToolRequestSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.any()).optional(),
});

const MCPCallToolParamsSchema = z.object({
  subAction: z.literal('callTool'),
  subActionParams: CallToolRequestSchema,
});

export const MCPExecutorParamsSchema = z.union([MCPListToolsParamsSchema, MCPCallToolParamsSchema]);
