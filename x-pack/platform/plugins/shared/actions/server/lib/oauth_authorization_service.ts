/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { ActionsClient } from '../actions_client';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../common';

/**
 * OAuth connector secrets stored in encrypted saved objects
 */
interface OAuthConnectorSecrets {
  authorizationUrl?: string;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  scope?: string;
  redirectUri?: string;
}

/**
 * OAuth connector configuration
 */
interface OAuthConnectorConfig {
  authType?: string;
  auth?: {
    type?: string;
  };
  authorizationUrl?: string;
  clientId?: string;
  tokenUrl?: string;
  scope?: string;
  redirectUri?: string;
}

/**
 * OAuth configuration required for authorization flow
 */
export interface OAuthConfig {
  authorizationUrl: string;
  clientId: string;
  scope?: string;
  redirectUri?: string;
}

/**
 * Parameters for building an OAuth authorization URL
 */
interface BuildAuthorizationUrlParams {
  baseAuthorizationUrl: string;
  clientId: string;
  scope?: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

interface ConnectorWithOAuth {
  actionTypeId: string;
  name: string;
  config: OAuthConnectorConfig;
  secrets: OAuthConnectorSecrets;
}

/**
 * Service for handling OAuth2 Authorization Code flow operations
 *
 * This service encapsulates the business logic for:
 * - Validating connectors use OAuth Authorization Code flow
 * - Retrieving OAuth configuration with decrypted secrets
 * - Building OAuth authorization URLs with PKCE parameters
 */
export class OAuthAuthorizationService {
  /**
   * Creates an instance of OAuthAuthorizationService
   * @param actionsClient - Client for interacting with connectors
   * @param encryptedSavedObjectsClient - Client for accessing encrypted connector secrets
   * @param kibanaBaseUrl - The public base URL of the Kibana instance
   * @param logger - Logger instance for debugging
   */
  constructor(
    private readonly actionsClient: ActionsClient,
    private readonly encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
    private readonly kibanaBaseUrl: string,
    private readonly logger: Logger
  ) {}

  /**
   * Validates that a connector uses OAuth Authorization Code flow
   * @throws Error if connector doesn't use oauth_authorization_code
   */
  private validateOAuthConnector(config: OAuthConnectorConfig): void {
    const isOAuthAuthCode =
      config?.authType === 'oauth_authorization_code' ||
      config?.auth?.type === 'oauth_authorization_code';

    if (!isOAuthAuthCode) {
      throw new Error('Connector does not use OAuth Authorization Code flow');
    }
  }

  /**
   * Gets OAuth configuration for a connector with decrypted secrets
   * @param connectorId - The connector ID
   * @returns OAuth configuration including authorizationUrl, clientId, and optional scope
   * @throws Error if connector is not found, not OAuth, or missing required config
   */
  async getOAuthConfig(connectorId: string): Promise<OAuthConfig> {
    // Get connector to verify it exists and check auth type
    const connector = await this.actionsClient.get({ id: connectorId });
    const config = connector.config as OAuthConnectorConfig;

    // Validate this is an OAuth connector
    this.validateOAuthConnector(config);

    // Fetch connector with decrypted secrets
    const rawAction =
      await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<ConnectorWithOAuth>(
        'action',
        connectorId
      );

    const secrets = rawAction.attributes.secrets;

    // Extract OAuth config - for connector specs, check secrets first, then config
    const authorizationUrl = secrets.authorizationUrl || config?.authorizationUrl;
    const clientId = secrets.clientId || config?.clientId;
    const scope = secrets.scope || config?.scope;
    const redirectUri = secrets.redirectUri || config?.redirectUri;

    if (!authorizationUrl || !clientId) {
      throw new Error(
        'Connector missing required OAuth configuration (authorizationUrl, clientId)'
      );
    }

    return {
      authorizationUrl,
      clientId,
      scope,
      redirectUri,
    };
  }

  /**
   * Builds the redirect URI for OAuth callbacks
   *
   * The redirect URI is where the OAuth provider will send the user after authorization.
   * If a custom redirectURI is provided, it will be used. Otherwise, it points to the
   * oauth_callback route in this Kibana instance.
   *
   * @returns The complete redirect URI
   * @throws Error if Kibana public base URL is not configured and no custom URI provided
   * @param config
   */
  getRedirectUri(config: OAuthConnectorConfig): string {
    // If user configured a custom redirect URI, use that
    if (config.redirectUri) {
      this.logger.debug(`Using custom redirect URI: ${config.redirectUri}`);
      return config.redirectUri;
    }

    // Otherwise, fallback to Kibana URL-based redirect URI
    if (!this.kibanaBaseUrl) {
      throw new Error(
        'Kibana public URL not configured. Please set server.publicBaseUrl in kibana.yml'
      );
    }
    return `${this.kibanaBaseUrl}${INTERNAL_BASE_ACTION_API_PATH}/connector/_oauth_callback`;
  }

  /**
   * Builds an OAuth authorization URL with PKCE parameters
   * @param params - Parameters for building the authorization URL
   * @returns The complete authorization URL as a string
   */
  buildAuthorizationUrl(params: BuildAuthorizationUrlParams): string {
    const { baseAuthorizationUrl, clientId, scope, redirectUri, state, codeChallenge } = params;

    const authUrl = new URL(baseAuthorizationUrl);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    if (scope) {
      authUrl.searchParams.set('scope', scope);
    }

    return authUrl.toString();
  }
}
