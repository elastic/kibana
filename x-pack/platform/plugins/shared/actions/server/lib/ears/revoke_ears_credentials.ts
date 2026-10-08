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
 * via EARS. Both revokes are always attempted; request ids of the ones that succeeded are returned
 * alongside any errors so a partial failure doesn't lose them. Callers handle failures best-effort.
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
}): Promise<{ earsRequestIds: string[]; errors: unknown[] }> => {
  const tokensToRevoke = [
    credentials.accessToken ? stripTokenTypePrefix(credentials.accessToken) : undefined,
    credentials.refreshToken,
  ].filter((token): token is string => Boolean(token));

  const results = await Promise.allSettled(
    tokensToRevoke.map((token) =>
      requestEarsRevoke(provider, logger, { token }, configurationUtilities)
    )
  );

  const earsRequestIds: string[] = [];
  const errors: unknown[] = [];
  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(result.reason);
    } else if (result.value.earsRequestId) {
      earsRequestIds.push(result.value.earsRequestId);
    }
  }
  return { earsRequestIds, errors };
};
