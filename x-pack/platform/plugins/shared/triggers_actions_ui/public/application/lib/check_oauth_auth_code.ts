/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector } from '../../types';

/**
 * Checks if a connector uses OAuth Authorization Code flow
 * @param connector - The connector to check
 * @returns True if the connector uses oauth_authorization_code auth type
 */
export function usesOAuthAuthorizationCode(connector: ActionConnector): boolean {
  if (!connector || !connector.config) {
    return false;
  }

  const config = connector.config as Record<string, unknown>;

  return (
    config?.authType === 'oauth_authorization_code' ||
    (config?.auth as Record<string, unknown>)?.type === 'oauth_authorization_code'
  );
}
