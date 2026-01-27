/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OAuthTokenResponse } from './request_oauth_token';

/**
 * Function type for extracting OAuth tokens from a provider's response.
 * Different OAuth providers return tokens in different response structures.
 */
export type OAuthTokenExtractor = (responseData: Record<string, unknown>) => OAuthTokenResponse;

/**
 * Default OAuth token extractor for standard OAuth 2.0 responses.
 * Extracts tokens from the root level of the response.
 */
export const defaultTokenExtractor: OAuthTokenExtractor = (responseData) => ({
  tokenType: responseData.token_type as string,
  accessToken: responseData.access_token as string,
  expiresIn: responseData.expires_in as number | undefined,
  refreshToken: responseData.refresh_token as string | undefined,
  refreshTokenExpiresIn: responseData.refresh_token_expires_in as number | undefined,
});

/**
 * Slack OAuth v2 token extractor.
 * Slack's OAuth v2 returns user tokens nested in `authed_user` when user scopes are requested.
 * Bot tokens are at the root level, but user tokens (for scopes like search:read) are nested.
 */
export const slackUserTokenExtractor: OAuthTokenExtractor = (responseData) => {
  const authedUser = responseData.authed_user as Record<string, unknown> | undefined;

  // If authed_user has an access_token, use that (user token flow)
  // Otherwise fall back to root level (bot token flow)
  if (authedUser?.access_token) {
    return {
      tokenType: 'Bearer',
      accessToken: authedUser.access_token as string,
      expiresIn: undefined,
      refreshToken: undefined,
      refreshTokenExpiresIn: undefined,
    };
  }

  // Fall back to default extraction for bot tokens
  return defaultTokenExtractor(responseData);
};

/**
 * Registry of token extractors by extractor name.
 * Connector specs can reference these by name in their auth.types[].defaults.tokenExtractor
 */
const tokenExtractorRegistry: Record<string, OAuthTokenExtractor> = {
  default: defaultTokenExtractor,
  slackUserToken: slackUserTokenExtractor,
};

/**
 * Gets a token extractor by name, falling back to default if not found.
 */
export function getTokenExtractor(extractorName?: string): OAuthTokenExtractor {
  if (!extractorName) {
    return defaultTokenExtractor;
  }
  return tokenExtractorRegistry[extractorName] || defaultTokenExtractor;
}
