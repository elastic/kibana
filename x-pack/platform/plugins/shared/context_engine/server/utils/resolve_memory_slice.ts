/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import {
  extractApiKeyIdFromAuthzHeader,
  type SecurityServiceStart,
} from '@kbn/core-security-server';
import { isResponseError } from '@kbn/es-errors';

const REALM_SLICE_PREFIX = 'realm:';

/**
 * The slice holding the caller's memories, following the Agent Builder stable user id: the profile
 * uid when present, else the API key owner's profile uid, else a hash of realm and username.
 */
export const resolveMemorySlice = async ({
  request,
  security,
  esClient,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  esClient: ElasticsearchClient;
}): Promise<string | undefined> => {
  const user = security.authc.getCurrentUser(request);
  if (user?.profile_uid) {
    return user.profile_uid;
  }
  if (request.isFakeRequest || user?.authentication_type === 'api_key') {
    return resolveApiKeyOwnerProfileUid({ request, esClient });
  }
  const realm = user?.authentication_realm;
  if (!user?.username || !realm?.type || !realm?.name) {
    return undefined;
  }
  const digest = createHash('sha256')
    .update(JSON.stringify([realm.type, realm.name, user.username]))
    .digest('hex');
  return `${REALM_SLICE_PREFIX}${digest}`;
};

const resolveApiKeyOwnerProfileUid = async ({
  request,
  esClient,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
}): Promise<string | undefined> => {
  const id = extractApiKeyIdFromAuthzHeader(request.headers.authorization);
  if (!id) {
    return undefined;
  }
  try {
    const { api_keys: apiKeys } = await esClient.security.getApiKey({
      id,
      with_profile_uid: true,
    });
    return apiKeys?.[0]?.profile_uid;
  } catch (error) {
    if (isResponseError(error) && (error.statusCode === 403 || error.statusCode === 404)) {
      return undefined;
    }
    throw error;
  }
};
