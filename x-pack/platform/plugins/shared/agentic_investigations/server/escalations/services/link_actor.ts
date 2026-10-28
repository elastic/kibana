/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import { extractApiKeyIdFromAuthzHeader } from '@kbn/core-security-server';
import {
  conversationPrincipal,
  type ConversationAuthUser,
  type EscalationLinkActor,
} from '../../../common/escalations/can_link_escalation';

/** The principal Agent Builder stores for this caller, including an API key creator's profile uid. */
export const resolveLinkActor = async ({
  request,
  security,
  esClient,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  esClient: ElasticsearchClient;
}): Promise<EscalationLinkActor> => {
  const current = security.authc.getCurrentUser(request);
  if (!current?.username) {
    return {};
  }

  // Fake requests authenticate with an API key even when the user object hides that.
  const isApiKey = request.isFakeRequest || current.authentication_type === 'api_key';
  const profileUid =
    current.profile_uid ??
    (isApiKey ? await resolveApiKeyOwnerProfileUid({ request, esClient }) : undefined);

  const user: ConversationAuthUser = {
    username: current.username,
    profile_uid: profileUid,
    // Keep a failed lookup from falling through to a realm id. API key realms are not
    // the id Agent Builder stores.
    authentication_type: isApiKey ? 'api_key' : current.authentication_type,
    authentication_realm: current.authentication_realm,
  };

  return conversationPrincipal(user);
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
    const response = await esClient.security.getApiKey({
      with_profile_uid: true,
      id,
    });

    return response.api_keys?.[0]?.profile_uid;
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
