/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { UserIdAndName } from '@kbn/agent-builder-common';

/**
 * Resolves the current user from a request.
 *
 * For real HTTP requests, `security.authc.getCurrentUser` returns the authenticated user
 * (including profile_uid and username).
 *
 * For fake requests (e.g. from Task Manager using an API key), `getCurrentUser` returns null.
 * In that case, we fall back to the ES `_security/_authenticate` API, which works with API keys
 * and returns the username of the API key owner.
 */
export const getUserFromRequest = async ({
  request,
  security,
  esClient,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  esClient: ElasticsearchClient;
}): Promise<UserIdAndName> => {
  if (!request.isFakeRequest) {
    const authUser = security.authc.getCurrentUser(request);
    if (authUser) {
      return { id: authUser.profile_uid!, username: authUser.username };
    }
  }

  // Fallback for fake requests (e.g. Task Manager execution): call ES _security/_authenticate
  const authResponse = await esClient.security.authenticate();
  return { username: authResponse.username };
};
