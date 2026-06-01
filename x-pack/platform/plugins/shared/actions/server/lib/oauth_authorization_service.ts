/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { AuthMode } from '@kbn/connector-specs';
import type { ActionsClient } from '../actions_client';
import { BASE_ACTION_API_PATH } from '../../common';

/**
 * OAuth connector secrets stored in encrypted saved objects
 */
interface OAuthConnectorSecrets {
  authType?: string;
  provider?: string;
  authorizationUrl?: string;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  scope?: string;
  scopeParamName?: string;
}

/**
 * OAuth connector configuration
 */
interface OAuthConnectorConfig {
  authType?: string;
  authorizationUrl?: string;
  clientId?: string;
  tokenUrl?: string;
  scope?: string;
}

/**
 * OAuth configuration for standard OAuth Authorization Code flow
 */
export interface OAuthFlowConfig {
  authTypeId: 'oauth_authorization_code';
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  scope?: string;
  scopeParamName?: string;
}

/**
 * OAuth configuration for EARS (Elastic Authentication Redirect Service) flow
 */
export interface EarsFlowConfig {
  authTypeId: 'ears';
  provider: string;
  scope?: string;
}

export type OAuthConfig = OAuthFlowConfig | EarsFlowConfig;

/**
 * Parameters for building an OAuth authorization URL
 */
interface BuildAuthorizationUrlParams {
  baseAuthorizationUrl: string;
  clientId: string;
  scope?: string;
  scopeParamName?: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

/**
 * Parameters for building an EARS authorization URL
 */
interface BuildEarsAuthorizationUrlParams {
  baseAuthorizationUrl: string;
  scope?: string;
  callbackUri: string;
  state: string;
  pkceChallenge: string;
}

interface ConnectorWithOAuth {
  actionTypeId: string;
  name: string;
  config: OAuthConnectorConfig;
  secrets: OAuthConnectorSecrets;
}

interface ConstructorOptions {
  actionsClient: ActionsClient;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
}

const RESERVED_AUTH_URL_PARAMS = new Set([
  'client_id',
  'response_type',
  'redirect_uri',
  'state',
  'code_challenge',
  'code_challenge_method',
]);

/**
 * Service for handling OAuth2 Authorization Code flow operations
 *
 * This service encapsulates the business logic for:
 * - Validating connectors use OAuth Authorization Code flow
 * - Retrieving OAuth configuration with decrypted secrets
 * - Building OAuth authorization URLs with PKCE parameters
 */
export class OAuthAuthorizationService {
  private readonly actionsClient: ActionsClient;
  private readonly encryptedSavedObjectsClient: EncryptedSavedObjectsClient;

  constructor({ actionsClient, encryptedSavedObjectsClient }: ConstructorOptions) {
    this.actionsClient = actionsClient;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
  }

  /**
   * Validates that a connector uses OAuth Authorization Code or EARS flow
   * @throws Error if connector doesn't use a supported OAuth flow
   */
  private validateOAuthConnector(
    config: OAuthConnectorConfig,
    secrets: OAuthConnectorSecrets,
    authMode?: AuthMode
  ): 'oauth_authorization_code' | 'ears' {
    const authType = secrets?.authType || config?.authType;

    if (authType === 'oauth_authorization_code' || authType === 'ears') {
      return authType;
    }

    if (authMode === 'per-user') {
      return 'oauth_authorization_code';
    }

    throw new Error('Connector does not use OAuth Authorization Code or EARS flow');
  }

  /**
   * Gets OAuth configuration for a connector with decrypted secrets
   * @param connectorId - The connector ID
   * @param namespace - The space ID where to look for the connector. For default space, it's undefined.
   * The namespace is the same as where the authorization was initiated from, which should be the space where the connector was created.
   * @returns OAuth configuration including authorizationUrl, clientId, and optional scope
   * @throws Error if connector is not found, not OAuth, or missing required config
   */
  async getOAuthConfig(connectorId: string, namespace: string | undefined): Promise<OAuthConfig> {
    // Get connector to verify it exists and check auth type
    const connector = await this.actionsClient.get({ id: connectorId });
    const config = connector.config as OAuthConnectorConfig;

    // Fetch connector with decrypted secrets
    const rawAction =
      await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<ConnectorWithOAuth>(
        'action',
        connectorId,
        { namespace }
      );
    const secrets = rawAction.attributes.secrets;

    // Validate this is an OAuth connector and get the resolved auth type
    const authTypeId = this.validateOAuthConnector(config, secrets, connector.authMode);

    const scope = secrets.scope || config?.scope;

    if (authTypeId === 'ears') {
      const provider = secrets.provider;
      if (!provider) {
        throw new Error('Connector missing required OAuth configuration (EARS provider)');
      }
      return {
        authTypeId: 'ears',
        provider,
        scope,
      };
    }

    // Standard OAuth Authorization Code flow requires clientId
    // Extract OAuth config - for connector specs, check secrets first, then config
    // For connector specs, OAuth config is always in secrets (encrypted)
    // Fallback to config for backwards compatibility with legacy connectors
    const authorizationUrl = secrets.authorizationUrl || config?.authorizationUrl;
    const tokenUrl = secrets.tokenUrl || config?.tokenUrl;
    const clientId = secrets.clientId || config?.clientId;
    if (!authorizationUrl || !tokenUrl || !clientId) {
      throw new Error(
        'Connector missing required OAuth configuration (authorizationUrl, tokenUrl, clientId)'
      );
    }

    const scopeParamName = secrets.scopeParamName;

    return {
      authTypeId: 'oauth_authorization_code',
      authorizationUrl,
      tokenUrl,
      clientId,
      scope,
      scopeParamName,
    };
  }

  /**
   * Builds the redirect URI for OAuth callbacks
   *
   * The redirect URI is where the OAuth provider will send the user after authorization.
   * It points to the oauth_callback route in this Kibana instance.
   *
   * @param publicBaseUrl - The Kibana public base URL (`server.publicBaseUrl`)
   * @returns The complete redirect URI
   * @throws Error if Kibana public base URL is not configured
   */
  static getRedirectUri(publicBaseUrl: string | undefined): string {
    if (!publicBaseUrl) {
      throw new Error(
        'Kibana public URL not configured. Please set server.publicBaseUrl in kibana.yml'
      );
    }
    return `${publicBaseUrl}${BASE_ACTION_API_PATH}/connector/_oauth_callback`;
  }

  /**
   * Builds an OAuth authorization URL with PKCE parameters
   * @param params - Parameters for building the authorization URL
   * @returns The complete authorization URL as a string
   */
  buildAuthorizationUrl(params: BuildAuthorizationUrlParams): string {
    const {
      baseAuthorizationUrl,
      clientId,
      scope,
      scopeParamName,
      redirectUri,
      state,
      codeChallenge,
    } = params;

    const authUrl = new URL(baseAuthorizationUrl);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    if (scope) {
      if (scopeParamName && RESERVED_AUTH_URL_PARAMS.has(scopeParamName)) {
        throw new Error(
          `scopeParamName "${scopeParamName}" conflicts with a reserved OAuth parameter`
        );
      }
      authUrl.searchParams.set(scopeParamName ?? 'scope', scope);
    }

    return authUrl.toString();
  }

  /**
   * Builds an EARS authorization URL with PKCE parameters.
   *
   * EARS uses different parameter names than standard OAuth:
   * - `callback_uri` instead of `redirect_uri`
   * - `pkce_challenge` instead of `code_challenge`
   * - `pkce_method` instead of `code_challenge_method`
   * - No `client_id` or `response_type` (EARS manages client credentials)
   */
  buildEarsAuthorizationUrl(params: BuildEarsAuthorizationUrlParams): string {
    const { baseAuthorizationUrl, scope, callbackUri, state, pkceChallenge } = params;

    const authUrl = new URL(baseAuthorizationUrl);
    authUrl.searchParams.set('callback_uri', callbackUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('pkce_challenge', pkceChallenge);
    authUrl.searchParams.set('pkce_method', 'S256');

    if (scope) {
      authUrl.searchParams.set('scope', scope);
    }

    return authUrl.toString();
  }
}
