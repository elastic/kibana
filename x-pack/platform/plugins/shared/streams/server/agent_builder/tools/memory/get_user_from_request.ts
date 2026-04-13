/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';

interface UserIdAndName {
  id?: string;
  username: string;
}

/**
 * Resolves the current user from the request.
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
      return { id: authUser.profile_uid ?? undefined, username: authUser.username };
    }
  }

  // Fallback for fake requests (e.g. Task Manager execution): call ES _security/_authenticate
  const authResponse = await esClient.security.authenticate();
  return { username: authResponse.username };
};
