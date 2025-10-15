/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OAuthTokenSet } from '@kbn/onechat-common';

/**
 * Stored token data including metadata for refresh
 */
interface StoredTokenData extends OAuthTokenSet {
  tokenEndpoint?: string; // Stored for token refresh
}

/**
 * OAuth Token Storage
 *
 * Manages OAuth tokens in browser localStorage.
 * Tokens are scoped per-user and per-server for isolation.
 */
export class OAuthTokenStorage {
  private readonly storagePrefix = 'onechat.mcp.oauth';

  /**
   * Generate storage key for a user and server
   */
  private storageKey(userId: string, serverId: string): string {
    return `${this.storagePrefix}.${userId}.${serverId}`;
  }

  /**
   * Store OAuth token set for a user and server
   *
   * @param userId Current user ID
   * @param serverId MCP server ID
   * @param tokenSet OAuth token set to store
   * @param tokenEndpoint Optional token endpoint for refresh
   */
  setToken(
    userId: string,
    serverId: string,
    tokenSet: OAuthTokenSet,
    tokenEndpoint?: string
  ): void {
    const key = this.storageKey(userId, serverId);

    // Calculate expires_at if expires_in is provided
    const tokenToStore: StoredTokenData = {
      ...tokenSet,
      expires_at: tokenSet.expires_in
        ? Math.floor(Date.now() / 1000) + tokenSet.expires_in
        : tokenSet.expires_at,
      tokenEndpoint,
    };

    try {
      localStorage.setItem(key, JSON.stringify(tokenToStore));
    } catch (error) {
      // Handle quota exceeded or other storage errors
      console.error('Failed to store OAuth token:', error);
      throw new Error('Failed to save authentication token. Please try again.');
    }
  }

  /**
   * Retrieve OAuth token set for a user and server
   *
   * @param userId Current user ID
   * @param serverId MCP server ID
   * @returns Token set with metadata or null if not found
   */
  getToken(userId: string, serverId: string): StoredTokenData | null {
    const key = this.storageKey(userId, serverId);

    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        return null;
      }

      const tokenSet = JSON.parse(stored) as StoredTokenData;

      // Validate token structure - only require access_token
      // token_type might be missing or different for some providers
      if (!tokenSet.access_token) {
        console.warn('Invalid token structure found in storage: missing access_token');
        this.clearToken(userId, serverId);
        return null;
      }

      return tokenSet;
    } catch (error) {
      console.error('Failed to retrieve OAuth token:', error);
      return null;
    }
  }

  /**
   * Check if a token set is expired
   *
   * @param tokenSet Token set to check
   * @returns True if token is expired or will expire within 60 seconds
   */
  isTokenExpired(tokenSet: OAuthTokenSet): boolean {
    if (!tokenSet.expires_at) {
      // If no expiry time, assume not expired
      return false;
    }

    // Consider token expired if it expires within 60 seconds (safety buffer)
    const expiryTime = tokenSet.expires_at * 1000; // Convert to milliseconds
    const bufferTime = 60 * 1000; // 60 seconds buffer

    return Date.now() >= expiryTime - bufferTime;
  }

  /**
   * Clear OAuth token for a user and server
   *
   * @param userId Current user ID
   * @param serverId MCP server ID
   */
  clearToken(userId: string, serverId: string): void {
    const key = this.storageKey(userId, serverId);
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear OAuth token:', error);
    }
  }

  /**
   * Get all server IDs that have tokens for a user
   *
   * Scans localStorage for all tokens belonging to the specified user.
   *
   * @param userId Current user ID
   * @returns Array of server IDs
   */
  getAllServerIds(userId: string): string[] {
    const prefix = `${this.storagePrefix}.${userId}.`;
    const serverIds: string[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          // Extract serverId from key: "onechat.mcp.oauth.{userId}.{serverId}"
          const serverId = key.substring(prefix.length);
          if (serverId) {
            serverIds.push(serverId);
          }
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to scan localStorage for server IDs:', error);
    }

    return serverIds;
  }

  /**
   * Clear all OAuth tokens for a user (across all servers)
   *
   * @param userId Current user ID
   */
  clearAllTokens(userId: string): void {
    const prefix = `${this.storagePrefix}.${userId}.`;

    try {
      const keysToRemove: string[] = [];

      // Find all keys for this user
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove all found keys
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear all OAuth tokens:', error);
    }
  }

  /**
   * List all server IDs for which a user has tokens
   *
   * @param userId Current user ID
   * @returns Array of server IDs
   */
  listServerIds(userId: string): string[] {
    const prefix = `${this.storagePrefix}.${userId}.`;
    const serverIds: string[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          // Extract server ID from key
          const serverId = key.substring(prefix.length);
          serverIds.push(serverId);
        }
      }
    } catch (error) {
      console.error('Failed to list server IDs:', error);
    }

    return serverIds;
  }
}
