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
 * Resolves the acting user for a write.
 *
 * Falls back to `_security/_authenticate` when the request is a fake one (a
 * workflow-driven run) or when core's security service is unavailable, so writes
 * are always attributed to someone.
 */
export const getUserFromRequest = async ({
  request,
  security,
  esClient,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart | undefined;
  esClient: ElasticsearchClient;
}): Promise<UserIdAndName> => {
  if (security && !request.isFakeRequest) {
    const authUser = security.authc.getCurrentUser(request);
    if (authUser) {
      return { id: authUser.profile_uid ?? undefined, username: authUser.username };
    }
  }

  // Fallback for fake requests (e.g. workflow execution): ask Elasticsearch who we are
  const authResponse = await esClient.security.authenticate();
  return { username: authResponse.username };
};
