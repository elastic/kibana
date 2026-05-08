/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector } from '../../types';

const OAUTH_AUTH_TYPES = new Set(['oauth_authorization_code', 'ears']);

/**
 * Checks if a connector uses an OAuth Authorization Code flow
 * @param connector - The connector to check
 * @returns True if the connector uses oauth_authorization_code or ears auth type
 */
export function usesOAuthAuthorizationCode(connector: ActionConnector): boolean {
  if (!connector || connector.isPreconfigured || connector.isSystemAction) {
    return false;
  }

  const config = connector.config as Record<string, unknown>;
  const authType = config?.authType as string;

  return OAUTH_AUTH_TYPES.has(authType) || connector.authMode === 'per-user';
}
