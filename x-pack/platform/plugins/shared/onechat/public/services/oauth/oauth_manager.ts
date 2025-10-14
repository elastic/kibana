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

  constructor(
    private http: HttpSetup,
    private getCurrentUserId: () => string
  ) {
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
    } catch (error) {
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
      metadata.token_endpoint
    );

    // Store token
    const userId = this.getCurrentUserId();
    this.storage.setToken(userId, serverId, tokenSet);

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
          console.error('Token refresh failed:', error);
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
   * Get redirect URI for OAuth callback
   */
  private getRedirectUri(): string {
    return `${window.location.origin}/app/onechat/oauth/callback`;
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
   */
  private async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    clientId: string,
    tokenEndpoint: string
  ): Promise<OAuthTokenSet> {
    // Build token request body
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.getRedirectUri(),
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    try {
      // Token endpoint requires application/x-www-form-urlencoded
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.statusText} - ${errorText}`);
      }

      const tokenData = await response.json();
      
      if (!tokenData.access_token) {
        throw new Error('Invalid token response: missing access_token');
      }

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type || 'Bearer',
        scope: tokenData.scope,
      };
    } catch (error) {
      throw new OAuthError(
        OAuthErrorType.NETWORK_ERROR,
        `Failed to exchange code for token: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshToken(serverId: string, refreshToken: string): Promise<string> {
    // TODO: Implement token refresh
    // Need to store token endpoint for refresh requests
    // For now, just return null to trigger re-authentication
    throw new Error('Token refresh not yet implemented');
  }
}

