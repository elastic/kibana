/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type {
  CallToolRequest,
  MCPConnectorConfig,
  MCPConnectorSecrets,
  MCPConnectorSecretsNone,
  MCPConnectorSecretsBearer,
  MCPConnectorSecretsApiKey,
  MCPConnectorSecretsBasic,
  MCPConnectorSecretsCustomHeaders,
  MCPCallToolParams,
  MCPListToolsParams,
  MCPConnectorHTTPServiceConfig,
} from '@kbn/mcp-connector-common';

// ============================================================================
// CONFIG SCHEMAS (Non-sensitive metadata, not encrypted)
// ============================================================================

/**
 * Schema for MCP connector HTTP service configuration.
 *
 * Contains only non-sensitive metadata. Credentials are validated separately
 * via MCPConnectorSecretsSchema.
 */
export const MCPConnectorHTTPServiceConfigSchema: Type<MCPConnectorHTTPServiceConfig> =
  schema.object({
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
export const MCPConnectorConfigSchema: Type<MCPConnectorConfig> = schema.allOf([
  schema.object({
    uniqueId: schema.maybe(schema.string({ minLength: 1 })),
    description: schema.maybe(schema.string()),
    service: schema.oneOf([MCPConnectorHTTPServiceConfigSchema]),
  }),
]);

// ============================================================================
// SECRETS SCHEMAS (Credentials, encrypted by encryptedSavedObjects)
// ============================================================================

/**
 * Schema for no authentication secrets.
 *
 * Used when authType is 'none'.
 */
export const MCPConnectorSecretsNoneSchema: Type<MCPConnectorSecretsNone> = schema.object({
  authType: schema.literal('none'),
});

/**
 * Schema for Bearer token authentication secrets.
 *
 * Used when authType is 'bearer'.
 */
export const MCPConnectorSecretsBearerSchema: Type<MCPConnectorSecretsBearer> = schema.object({
  authType: schema.literal('bearer'),
  token: schema.string({ minLength: 1 }),
});

/**
 * Schema for API key authentication secrets.
 *
 * Used when authType is 'apiKey'.
 */
export const MCPConnectorSecretsApiKeySchema: Type<MCPConnectorSecretsApiKey> = schema.object({
  authType: schema.literal('apiKey'),
  apiKey: schema.string({ minLength: 1 }),
});

/**
 * Schema for Basic authentication secrets.
 *
 * Used when authType is 'basic'.
 */
export const MCPConnectorSecretsBasicSchema: Type<MCPConnectorSecretsBasic> = schema.object({
  authType: schema.literal('basic'),
  username: schema.string({ minLength: 1 }),
  password: schema.string({ minLength: 1 }),
});

/**
 * Schema for custom headers authentication secrets.
 *
 * Used when authType is 'customHeaders'.
 */
export const MCPConnectorSecretsCustomHeadersSchema: Type<MCPConnectorSecretsCustomHeaders> =
  schema.object({
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
export const MCPConnectorSecretsSchema: Type<MCPConnectorSecrets> = schema.oneOf([
  MCPConnectorSecretsNoneSchema,
  MCPConnectorSecretsBearerSchema,
  MCPConnectorSecretsApiKeySchema,
  MCPConnectorSecretsBasicSchema,
  MCPConnectorSecretsCustomHeadersSchema,
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
