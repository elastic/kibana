/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { requestEarsRevoke } from './request_ears_revoke';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import type { OAuthPersonalCredentials } from '../../types';

// The stored access token is formatted as "<tokenType> <token>" (e.g. "Bearer abc123").
const stripTokenTypePrefix = (accessToken: string): string => {
  const spaceIndex = accessToken.indexOf(' ');
  return spaceIndex === -1 ? accessToken : accessToken.slice(spaceIndex + 1);
};

/**
 * Revokes both the access token and refresh token for a set of stored OAuth credentials
 * via EARS. Throws on failure — callers are responsible for best-effort handling.
 */
export const revokeEarsCredentials = async ({
  provider,
  credentials,
  configurationUtilities,
  logger,
}: {
  provider: string;
  credentials: OAuthPersonalCredentials;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
}): Promise<void> => {
  const tokensToRevoke = [
    credentials.accessToken ? stripTokenTypePrefix(credentials.accessToken) : undefined,
    credentials.refreshToken,
  ].filter((token): token is string => Boolean(token));

  await Promise.all(
    tokensToRevoke.map((token) =>
      requestEarsRevoke(provider, logger, { token }, configurationUtilities)
    )
  );
};
