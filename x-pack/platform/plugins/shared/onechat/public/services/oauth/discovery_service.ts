/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { OAuthServerMetadata, ProtectedResourceMetadata } from '@kbn/onechat-common';
import { OAuthError, OAuthErrorType, type OAuthDiscoveryConfig } from './types';

/**
 * OAuth Discovery Service
 * 
 * Implements OAuth server discovery per MCP specification:
 * - RFC9728: OAuth 2.0 Protected Resource Metadata
 * - RFC8414: OAuth 2.0 Authorization Server Metadata
 * - OpenID Connect Discovery 1.0
 */
export class OAuthDiscoveryService {
  constructor(private http: HttpSetup) {}

  /**
   * Discover OAuth authorization server for an MCP server
   * 
   * @param config Discovery configuration
   * @returns OAuth server metadata including endpoints
   */
  async discoverAuthServer(config: OAuthDiscoveryConfig): Promise<OAuthServerMetadata> {
    try {
      // Step 1: Get Protected Resource Metadata (RFC9728)
      const resourceMetadata = await this.getProtectedResourceMetadata(config);

      if (!resourceMetadata.authorization_servers || resourceMetadata.authorization_servers.length === 0) {
        throw new OAuthError(
          OAuthErrorType.NO_AUTHORIZATION_SERVER,
          'No authorization servers found in protected resource metadata'
        );
      }

      // Use first authorization server
      const issuer = resourceMetadata.authorization_servers[0];

      // Step 2: Discover Authorization Server Metadata
      return await this.getAuthServerMetadata(issuer);
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      throw new OAuthError(
        OAuthErrorType.DISCOVERY_FAILED,
        `OAuth server discovery failed: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Get Protected Resource Metadata (RFC9728)
   * 
   * Tries multiple discovery methods:
   * 1. WWW-Authenticate header from 401 response
   * 2. Well-known URI with MCP path
   * 3. Well-known URI at root
   */
  private async getProtectedResourceMetadata(
    config: OAuthDiscoveryConfig
  ): Promise<ProtectedResourceMetadata> {
    const { mcpServerUrl, discoveryUrl } = config;

    // If explicit discovery URL provided, try that first
    if (discoveryUrl) {
      try {
        return await this.fetchProtectedResourceMetadata(discoveryUrl);
      } catch (error) {
        // Fall through to well-known URIs
      }
    }

    // Build well-known URIs per RFC9728
    const url = new URL(mcpServerUrl);
    const wellKnownUris = this.buildProtectedResourceWellKnownUris(url);

    // Try each well-known URI
    for (const uri of wellKnownUris) {
      try {
        return await this.fetchProtectedResourceMetadata(uri);
      } catch (error) {
        // Continue to next URI
        continue;
      }
    }

    throw new OAuthError(
      OAuthErrorType.DISCOVERY_FAILED,
      'Failed to discover protected resource metadata'
    );
  }

  /**
   * Build well-known URIs for protected resource metadata (RFC9728)
   */
  private buildProtectedResourceWellKnownUris(url: URL): string[] {
    const uris: string[] = [];
    const origin = `${url.protocol}//${url.host}`;
    const path = url.pathname;

    // If there's a path, try with path insertion
    if (path && path !== '/') {
      uris.push(`${origin}/.well-known/oauth-protected-resource${path}`);
    }

    // Always try root well-known URI
    uris.push(`${origin}/.well-known/oauth-protected-resource`);

    return uris;
  }

  /**
   * Fetch protected resource metadata from URL
   */
  private async fetchProtectedResourceMetadata(url: string): Promise<ProtectedResourceMetadata> {
    const response = await this.http.fetch<ProtectedResourceMetadata>(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!this.validateProtectedResourceMetadata(response)) {
      throw new OAuthError(
        OAuthErrorType.INVALID_METADATA,
        'Invalid protected resource metadata format'
      );
    }

    return response;
  }

  /**
   * Validate protected resource metadata
   */
  private validateProtectedResourceMetadata(metadata: any): metadata is ProtectedResourceMetadata {
    return (
      metadata &&
      typeof metadata === 'object' &&
      Array.isArray(metadata.authorization_servers) &&
      metadata.authorization_servers.length > 0
    );
  }

  /**
   * Get Authorization Server Metadata (RFC8414 / OpenID Connect Discovery)
   * 
   * Tries multiple well-known endpoints per MCP specification:
   * - For issuer with path: OAuth 2.0 with path insertion, OIDC with path insertion, OIDC with path appending
   * - For issuer without path: OAuth 2.0, OIDC
   */
  private async getAuthServerMetadata(issuer: string): Promise<OAuthServerMetadata> {
    const discoveryUrls = this.buildAuthServerDiscoveryUrls(issuer);

    // Try each discovery URL
    for (const url of discoveryUrls) {
      try {
        const metadata = await this.fetchAuthServerMetadata(url);
        return metadata;
      } catch (error) {
        // Continue to next URL
        continue;
      }
    }

    throw new OAuthError(
      OAuthErrorType.DISCOVERY_FAILED,
      `Failed to discover authorization server metadata for issuer: ${issuer}`
    );
  }

  /**
   * Build authorization server discovery URLs per MCP spec
   * 
   * Per MCP specification for backwards compatibility:
   * - Try OAuth 2.0 Authorization Server Metadata (RFC8414) endpoints
   * - Try OpenID Connect Discovery 1.0 endpoints
   * - For URLs with path components, try path insertion and appending
   */
  private buildAuthServerDiscoveryUrls(issuer: string): string[] {
    const urls: string[] = [];
    const url = new URL(issuer);
    const origin = `${url.protocol}//${url.host}`;
    const path = url.pathname;

    // Has path component (e.g., https://auth.example.com/tenant1)
    if (path && path !== '/') {
      // OAuth 2.0 with path insertion
      urls.push(`${origin}/.well-known/oauth-authorization-server${path}`);
      // OpenID Connect with path insertion
      urls.push(`${origin}/.well-known/openid-configuration${path}`);
      // OpenID Connect with path appending
      urls.push(`${issuer}/.well-known/openid-configuration`);
    } else {
      // No path component (e.g., https://auth.example.com)
      // OAuth 2.0
      urls.push(`${origin}/.well-known/oauth-authorization-server`);
      // OpenID Connect
      urls.push(`${origin}/.well-known/openid-configuration`);
    }

    return urls;
  }

  /**
   * Fetch authorization server metadata from URL
   */
  private async fetchAuthServerMetadata(url: string): Promise<OAuthServerMetadata> {
    const response = await this.http.fetch<OAuthServerMetadata>(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!this.validateAuthServerMetadata(response)) {
      throw new OAuthError(
        OAuthErrorType.INVALID_METADATA,
        'Invalid authorization server metadata format'
      );
    }

    // Verify PKCE support (required by MCP spec)
    if (!response.code_challenge_methods_supported?.includes('S256')) {
      throw new OAuthError(
        OAuthErrorType.PKCE_NOT_SUPPORTED,
        'Authorization server does not support PKCE with S256 (required by MCP specification)'
      );
    }

    return response;
  }

  /**
   * Validate authorization server metadata
   */
  private validateAuthServerMetadata(metadata: any): metadata is OAuthServerMetadata {
    return (
      metadata &&
      typeof metadata === 'object' &&
      typeof metadata.authorization_endpoint === 'string' &&
      typeof metadata.token_endpoint === 'string' &&
      Array.isArray(metadata.code_challenge_methods_supported)
    );
  }
}

