/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveApiKeyOwnerProfileUid, toStableUserId } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import {
  extractApiKeyIdFromAuthzHeader,
  type SecurityServiceStart,
} from '@kbn/core-security-server';
import type { MemoryUser } from './memory_document';

/** The calling user's stable id (as Agent Builder computes it) and username. */
export const getMemoryUser = async ({
  request,
  security,
  esClient,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  /** Scoped to the caller; used to look up the owner of an API key. */
  esClient: ElasticsearchClient;
}): Promise<MemoryUser> => {
  const authUser = security.authc.getCurrentUser(request);
  if (!authUser) {
    return {};
  }
  const id = await toStableUserId({
    authUser,
    request,
    resolveApiKeyProfileUid: () =>
      resolveApiKeyOwnerProfileUid({
        apiKeyId: extractApiKeyIdFromAuthzHeader(request.headers.authorization),
        esClient,
      }),
  });
  return { id, username: authUser.username };
};
