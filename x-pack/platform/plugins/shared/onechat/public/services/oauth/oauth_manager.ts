/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { OAuthTokenSet, OAuthServerMetadata, McpOAuthConfig } from '@kbn/onechat-common';
import { OAuthDiscoveryService } from './discovery_service';
import { PKCEHelper } from './pkce';
import { OAuthTokenStorage } from './token_storage';
import { OAuthError, OAuthErrorType } from './types';

/**
 * OAuth state stored in sessionStorage during flow
 */
interface OAuthFlowState {
  codeVerifier: string;
  serverId: string;
  serverConfig: McpOAuthConfig;
  metadata: OAuthServerMetadata;
}

/**
 * OAuth Manager
 *
 * Manages OAuth 2.1 authorization code flow with PKCE for MCP servers.
 * Handles discovery, authorization, token exchange, refresh, and storage.
 */
export class OAuthManager {
  private readonly pkce: PKCEHelper;
  private readonly storage: OAuthTokenStorage;
  private readonly discovery: OAuthDiscoveryService;

  constructor(private http: HttpSetup, private getCurrentUserId: () => string) {
    this.pkce = new PKCEHelper();
    this.storage = new OAuthTokenStorage();
    this.discovery = new OAuthDiscoveryService(http);
  }

  /**
   * Initiate OAuth authorization code flow with PKCE
   *
   * Redirects browser to OAuth provider's authorization endpoint.
   * State is stored in sessionStorage for callback handling.
   *
   * @param serverId MCP server ID
   * @param serverUrl MCP server URL
   * @param config OAuth configuration for the server
   */
  async initiateAuthFlow(
    serverId: string,
    serverUrl: string,
    config: McpOAuthConfig
  ): Promise<void> {
    try {
      // Discover OAuth server metadata
      const metadata = await this.discoverOrUseConfig(serverUrl, config);

      // Generate PKCE pair
      const codeVerifier = await this.pkce.generateCodeVerifier();
      const codeChallenge = await this.pkce.generateCodeChallenge(codeVerifier);

      // Generate state parameter for CSRF protection
      const state = crypto.randomUUID();

      // Store flow state in sessionStorage for callback
      const flowState: OAuthFlowState = {
        codeVerifier,
        serverId,
        serverConfig: config,
        metadata,
      };
      sessionStorage.setItem(`oauth.${state}`, JSON.stringify(flowState));

      // Build authorization URL
      const authUrl = new URL(metadata.authorization_endpoint);
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', this.getRedirectUri());
      authUrl.searchParams.set('scope', config.scopes?.join(' ') || '');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      // Store return URL for post-callback navigation
      const returnTo = window.location.pathname + window.location.search;
      sessionStorage.setItem('oauth.returnTo', returnTo);

      // Redirect to authorization endpoint
      window.location.href = authUrl.toString();
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      throw new OAuthError(
        OAuthErrorType.DISCOVERY_FAILED,
        `Failed to initiate OAuth flow: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Handle OAuth callback after user authorization
   *
   * Exchanges authorization code for access token using PKCE.
   * Stores token in localStorage and cleans up session state.
   *
   * @param params URL search params from callback
   * @returns serverId of the authenticated server
   */
  async handleCallback(params: URLSearchParams): Promise<string> {
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    // Check for authorization errors
    if (error) {
      throw new OAuthError(
        OAuthErrorType.DISCOVERY_FAILED,
        `OAuth authorization failed: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`
      );
    }

    // Validate callback parameters
    if (!code || !state) {
      throw new OAuthError(
        OAuthErrorType.DISCOVERY_FAILED,
        'Invalid OAuth callback: missing code or state parameter'
      );
    }

    // Retrieve flow state from sessionStorage
    const flowStateJson = sessionStorage.getItem(`oauth.${state}`);
    if (!flowStateJson) {
      throw new OAuthError(
        OAuthErrorType.DISCOVERY_FAILED,
        'OAuth state mismatch: flow state not found (possible CSRF attempt or expired session)'
      );
    }

    let flowState: OAuthFlowState;
    try {
      flowState = JSON.parse(flowStateJson);
    } catch (parseError) {
      throw new OAuthError(
        OAuthErrorType.DISCOVERY_FAILED,
        'Invalid OAuth flow state in session storage'
      );
    }

    const { codeVerifier, serverId, serverConfig, metadata } = flowState;

    // Exchange authorization code for access token
    const tokenSet = await this.exchangeCodeForToken(
      code,
      codeVerifier,
      serverConfig.clientId,
      serverConfig.clientSecret,
      metadata.token_endpoint
    );

    // Store token with token endpoint for refresh
    const userId = this.getCurrentUserId();
    this.storage.setToken(userId, serverId, tokenSet, metadata.token_endpoint);

    // eslint-disable-next-line no-console
    console.log(`Stored OAuth token for user "${userId}", server "${serverId}"`, {
      hasAccessToken: !!tokenSet.access_token,
      hasRefreshToken: !!tokenSet.refresh_token,
      expiresIn: tokenSet.expires_in,
    });

    // Cleanup session storage
    sessionStorage.removeItem(`oauth.${state}`);

    return serverId;
  }

  /**
   * Get valid access token for a server
   *
   * Returns cached token if valid, attempts refresh if expired.
   * Returns null if no token or refresh fails.
   *
   * @param serverId MCP server ID
   * @returns Access token or null
   */
  async getValidToken(serverId: string): Promise<string | null> {
    const userId = this.getCurrentUserId();
    const tokenSet = this.storage.getToken(userId, serverId);

    // eslint-disable-next-line no-console
    console.log(`Retrieving OAuth token for user "${userId}", server "${serverId}"`, {
      found: !!tokenSet,
      hasAccessToken: tokenSet ? !!tokenSet.access_token : false,
    });

    if (!tokenSet) {
      return null;
    }

    // Check if token is expired
    if (this.storage.isTokenExpired(tokenSet)) {
      // Try to refresh if refresh token available
      if (tokenSet.refresh_token) {
        try {
          const refreshedToken = await this.refreshToken(serverId, tokenSet.refresh_token);
          return refreshedToken;
        } catch (error) {
          // Refresh failed, clear token
          // Token refresh failed, clear token and return null
          this.storage.clearToken(userId, serverId);
          return null;
        }
      }

      // No refresh token, token is expired
      this.storage.clearToken(userId, serverId);
      return null;
    }

    return tokenSet.access_token;
  }

  /**
   * Check if user has a valid token for a server
   *
   * @param serverId MCP server ID
   * @returns True if valid token exists
   */
  async hasValidToken(serverId: string): Promise<boolean> {
    const token = await this.getValidToken(serverId);
    return token !== null;
  }

  /**
   * Clear token for a server
   *
   * @param serverId MCP server ID
   */
  clearToken(serverId: string): void {
    const userId = this.getCurrentUserId();
    this.storage.clearToken(userId, serverId);
  }

  /**
   * Get all valid OAuth tokens for all MCP servers
   *
   * Returns a map of serverId -> accessToken for all servers where the user has valid tokens.
   * Automatically refreshes expired tokens if refresh tokens are available.
   *
   * @returns Record of serverId to access token
   */
  async getAllValidTokens(): Promise<Record<string, string>> {
    const userId = this.getCurrentUserId();
    const serverIds = this.storage.getAllServerIds(userId);
    const tokens: Record<string, string> = {};

    // Collect valid tokens for all servers
    await Promise.all(
      serverIds.map(async (serverId) => {
        try {
          const token = await this.getValidToken(serverId);
          if (token) {
            tokens[serverId] = token;
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to get token for MCP server ${serverId}:`, error);
        }
      })
    );

    return tokens;
  }

  /**
   * Get redirect URI for OAuth callback
   */
  private getRedirectUri(): string {
    return `${window.location.origin}/app/agent_builder/oauth/callback`;
  }

  /**
   * Discover OAuth metadata or use explicitly configured endpoints
   */
  private async discoverOrUseConfig(
    serverUrl: string,
    config: McpOAuthConfig
  ): Promise<OAuthServerMetadata> {
    // If explicit endpoints provided, use them
    if (config.authorizationEndpoint && config.tokenEndpoint) {
      return {
        authorization_endpoint: config.authorizationEndpoint,
        token_endpoint: config.tokenEndpoint,
        scopes_supported: config.scopes,
        code_challenge_methods_supported: ['S256'],
      };
    }

    // Otherwise, discover via well-known endpoints
    return await this.discovery.discoverAuthServer({
      mcpServerUrl: serverUrl,
      discoveryUrl: config.discoveryUrl,
    });
  }

  /**
   * Exchange authorization code for access token
   *
   * For confidential clients (with clientSecret), uses Basic Authentication per OAuth 2.0 spec.
   * For public clients (without clientSecret), uses PKCE only.
   */
  private async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    clientId: string,
    clientSecret: string | undefined,
    tokenEndpoint: string
  ): Promise<OAuthTokenSet> {
    // For confidential clients, use backend endpoint to securely exchange code
    // The backend has access to clientSecret
    const serverId = this.getServerIdFromSessionState();

    if (!serverId) {
      throw new Error('Server ID not found in session state');
    }

    try {
      const tokenData = await this.http.post<OAuthTokenSet>(
        `/internal/onechat/mcp/servers/${serverId}/oauth/token`,
        {
          body: JSON.stringify({
            code,
            codeVerifier,
            redirectUri: this.getRedirectUri(),
          }),
        }
      );

      if (!tokenData.access_token) {
        throw new Error('Invalid token response: missing access_token');
      }

      return tokenData;
    } catch (error) {
      throw new OAuthError(
        OAuthErrorType.NETWORK_ERROR,
        `Failed to exchange code for token: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Get server ID from current OAuth flow session state
   */
  private getServerIdFromSessionState(): string | undefined {
    // Iterate through session storage to find the OAuth state
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('oauth.')) {
        const stateData = sessionStorage.getItem(key);
        if (stateData) {
          try {
            const parsed = JSON.parse(stateData);
            return parsed.serverId;
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Refresh access token using refresh token
   *
   * @param serverId MCP server ID
   * @param refreshToken Refresh token to use
   * @returns New access token
   */
  private async refreshToken(serverId: string, refreshToken: string): Promise<string> {
    const userId = this.getCurrentUserId();
    const storedToken = this.storage.getToken(userId, serverId);

    if (!storedToken?.tokenEndpoint) {
      throw new Error('Token endpoint not found for refresh');
    }

    try {
      // Build refresh token request body
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        // client_id is typically required for refresh
        // But we don't have it stored - would need to fetch from config
        // For now, attempt without it (some servers allow this)
      });

      const response = await fetch(storedToken.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.statusText} - ${errorText}`);
      }

      const tokenData = await response.json();

      if (!tokenData.access_token) {
        throw new Error('Invalid token refresh response: missing access_token');
      }

      const newTokenSet: OAuthTokenSet = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refreshToken, // Use new refresh token if provided
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type || 'Bearer',
        scope: tokenData.scope,
      };

      // Store refreshed token
      this.storage.setToken(userId, serverId, newTokenSet, storedToken.tokenEndpoint);

      return newTokenSet.access_token;
    } catch (error) {
      // Refresh failed, clear token to force re-authentication
      this.storage.clearToken(userId, serverId);
      throw new OAuthError(
        OAuthErrorType.NETWORK_ERROR,
        `Failed to refresh token: ${(error as Error).message}`,
        error as Error
      );
    }
  }
}
