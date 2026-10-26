/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MCPConnectorSecrets, MCPConnectorConfig } from '@kbn/connector-schemas/mcp';
import { API_KEY_PLACEHOLDER, MCPAuthType } from '@kbn/connector-schemas/mcp';
import { getBasicAuthHeader } from '@kbn/actions-plugin/server';

/**
 * Secrets object expected by actions.getCredential for the oauth_authorization_code auth type.
 * Field names match the auth type spec, which reads every value from the secret object.
 */
export interface McpOAuthAuthCodeSecrets {
  authType: 'oauth_authorization_code';
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  [key: string]: unknown;
}

/** True when the connector should resolve a per-user OAuth authorization-code token. */
export const isOAuthAuthorizationCode = (config: MCPConnectorConfig): boolean =>
  Boolean(config.hasAuth) && config.authType === MCPAuthType.OAuthAuthorizationCode;

/**
 * Builds the secrets object passed to actions.getCredential.
 * Throws a plain Error naming every missing required field.
 */
export const buildOAuthAuthCodeSecrets = (
  config: MCPConnectorConfig,
  secrets: MCPConnectorSecrets
): McpOAuthAuthCodeSecrets => {
  const { authorizationUrl, tokenUrl, clientId, scope } = config;
  const { clientSecret } = secrets;
  if (!authorizationUrl || !tokenUrl || !clientId || !clientSecret) {
    const missing = [
      ['authorizationUrl', authorizationUrl],
      ['tokenUrl', tokenUrl],
      ['clientId', clientId],
      ['clientSecret', clientSecret],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name)
      .join(', ');
    throw new Error(
      `MCP OAuth authorization code connector is missing required fields: ${missing}`
    );
  }

  return {
    authType: MCPAuthType.OAuthAuthorizationCode,
    authorizationUrl,
    tokenUrl,
    clientId,
    clientSecret,
    ...(scope ? { scope } : {}),
  };
};

/**
 * Builds HTTP headers from MCP connector config and secrets based on the authentication type.
 *
 * @param secrets - The MCP connector secrets (flat structure)
 * @param config - The MCP connector config (hasAuth, authType, apiKeyHeaderName, apiKeyHeaderValue)
 * @returns Record of HTTP headers to use for authentication
 */
export function buildHeadersFromSecrets(
  secrets: MCPConnectorSecrets,
  config: MCPConnectorConfig
): Record<string, string> {
  const headers: Record<string, string> = {};

  // If no authentication is configured, return empty headers
  if (!config.hasAuth) {
    return headers;
  }

  const authType = config.authType;

  switch (authType) {
    case MCPAuthType.Bearer:
      if (secrets.token) {
        headers.Authorization = `Bearer ${secrets.token}`;
      }
      break;

    case MCPAuthType.ApiKey:
      if (secrets.apiKey) {
        const headerName = config.apiKeyHeaderName ?? 'X-API-Key';
        headers[headerName] = config.apiKeyHeaderValue
          ? config.apiKeyHeaderValue.split(API_KEY_PLACEHOLDER).join(secrets.apiKey ?? '')
          : secrets.apiKey ?? '';
      }
      break;

    case MCPAuthType.Basic:
      if (secrets.user && secrets.password) {
        Object.assign(
          headers,
          getBasicAuthHeader({ username: secrets.user, password: secrets.password })
        );
      }
      break;

    default:
      // No specific auth type configured - this is valid when hasAuth is false
      break;
  }

  // Add any secret headers
  if (secrets.secretHeaders) {
    Object.assign(headers, secrets.secretHeaders);
  }

  return headers;
}
