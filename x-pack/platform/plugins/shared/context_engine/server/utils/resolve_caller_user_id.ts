/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { REALM_USER_ID_PREFIX, serviceAccountUserId } from '@kbn/agent-builder-common';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { AuthcRequestHandlerContext } from '@kbn/core-security-server';
import { extractApiKeyIdFromAuthzHeader } from '@kbn/core-security-server';

type RequestAuthc = Pick<AuthcRequestHandlerContext, 'getCurrentUser' | 'getPrincipal'>;

const resolveApiKeyOwnerProfileUid = async (
  request: KibanaRequest,
  esClient: ElasticsearchClient
): Promise<string | undefined> => {
  const id = extractApiKeyIdFromAuthzHeader(request.headers.authorization);
  if (!id) {
    return undefined;
  }
  try {
    const { api_keys: apiKeys } = await esClient.security.getApiKey({ id, with_profile_uid: true });
    return apiKeys?.[0]?.profile_uid;
  } catch (error) {
    if (
      error instanceof errors.ResponseError &&
      (error.statusCode === 403 || error.statusCode === 404)
    ) {
      return undefined;
    }
    throw error;
  }
};

/**
 * A copy of the id logic in Agent Builder's `getUserFromRequest`; keep the two in step, so session
 * events and Agent Builder conversations record the same user id.
 */
export const resolveCallerUserId = async ({
  request,
  authc,
  esClient,
}: {
  request: KibanaRequest;
  authc: RequestAuthc;
  esClient: ElasticsearchClient;
}): Promise<string | undefined> => {
  const principal = authc.getPrincipal();
  if (principal?.type === 'service_account') {
    return serviceAccountUserId(principal.serviceAccountId);
  }

  const user = authc.getCurrentUser();
  const isApiKey = user?.authentication_type === 'api_key';
  const profileUid =
    user?.profile_uid ??
    (isApiKey ? await resolveApiKeyOwnerProfileUid(request, esClient) : undefined);
  if (profileUid) {
    return profileUid;
  }
  if (isApiKey || !user) {
    return undefined;
  }

  const { username, authentication_realm: realm } = user;
  if (!realm?.type || !realm.name || !username) {
    return undefined;
  }
  return `${REALM_USER_ID_PREFIX}${JSON.stringify([realm.type, realm.name, username])}`;
};
