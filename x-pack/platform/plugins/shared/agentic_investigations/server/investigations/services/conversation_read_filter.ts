/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import {
  extractApiKeyIdFromAuthzHeader,
  type SecurityServiceStart,
} from '@kbn/core-security-server';
import {
  ConversationAccessControlMode,
  REALM_USER_ID_PREFIX,
  serviceAccountUserId,
} from '@kbn/agent-builder-common';

/*
 * Agent Builder's conversation read access, for queries its conversation client cannot run, such
 * as ES|QL over the conversations index read as the internal user. The filter is the only access
 * check on such a query, so it must stay in step with Agent Builder's own:
 * - `buildBaseFilters` in `agent_builder/server/services/conversation/client/client.ts`
 * - `buildReadAccessFilter` in `agent_builder/server/services/conversation/access_control/query.ts`
 * - `createSpaceDslFilter` in `agent_builder/server/utils/spaces.ts`
 * - `getUserFromRequest` and `toStableUserId` in `agent_builder/server/services/utils.ts`
 */

/** Who is reading, as Agent Builder records conversation owners. */
export interface ConversationReader {
  /** Profile uid, or a synthetic realm or service account id. Absent when none can be derived. */
  id?: string;
  username: string;
}

const DEFAULT_SPACE_ID = 'default';

const resolveApiKeyOwnerProfileUid = async (
  request: KibanaRequest,
  esClient: ElasticsearchClient
): Promise<string | undefined> => {
  const id = extractApiKeyIdFromAuthzHeader(request.headers.authorization);
  if (!id) {
    return undefined;
  }
  try {
    const response = await esClient.security.getApiKey({ with_profile_uid: true, id });
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

const toStableUserId = async ({
  authUser,
  request,
  esClient,
}: {
  authUser: {
    username?: string;
    profile_uid?: string;
    authentication_type?: string;
    authentication_realm?: { type?: string; name?: string };
  };
  request: KibanaRequest;
  esClient: ElasticsearchClient;
}): Promise<string | undefined> => {
  const isApiKey = request.isFakeRequest || authUser.authentication_type === 'api_key';
  const profileUid =
    authUser.profile_uid ??
    (isApiKey ? await resolveApiKeyOwnerProfileUid(request, esClient) : undefined);
  if (profileUid) {
    return profileUid;
  }
  if (isApiKey) {
    return undefined;
  }
  const realmType = authUser.authentication_realm?.type;
  const realmName = authUser.authentication_realm?.name;
  const { username } = authUser;
  if (!realmType || !realmName || !username) {
    return undefined;
  }
  return `${REALM_USER_ID_PREFIX}${JSON.stringify([realmType, realmName, username])}`;
};

/** The reader of a request; `esClient` is scoped to the request's user. */
export const resolveConversationReader = async ({
  request,
  security,
  esClient,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  esClient: ElasticsearchClient;
}): Promise<ConversationReader> => {
  const authUser = security.authc.getCurrentUser(request);
  const principal = security.authc.getPrincipal(request);
  if (principal?.type === 'service_account') {
    return {
      id: serviceAccountUserId(principal.serviceAccountId),
      username: authUser?.username ?? (await esClient.security.authenticate()).username,
    };
  }
  const username = authUser?.username ?? (await esClient.security.authenticate()).username;
  return { id: await toStableUserId({ authUser: authUser ?? {}, request, esClient }), username };
};

const buildSpaceFilter = (spaceId: string): QueryDslQueryContainer =>
  spaceId === DEFAULT_SPACE_ID
    ? {
        bool: {
          should: [
            { term: { space: spaceId } },
            { bool: { must_not: { exists: { field: 'space' } } } },
          ],
          minimum_should_match: 1,
        },
      }
    : { bool: { should: [{ term: { space: spaceId } }], minimum_should_match: 1 } };

const buildReadAccessFilter = ({
  reader,
  agentIds,
}: {
  reader: ConversationReader;
  agentIds: string[];
}): QueryDslQueryContainer => {
  const owned: QueryDslQueryContainer[] = [
    ...(reader.id !== undefined ? [{ term: { user_id: reader.id } }] : []),
    // Conversations stored before `user_id` existed are owned by username.
    {
      bool: {
        must_not: { exists: { field: 'user_id' } },
        filter: { term: { user_name: reader.username } },
      },
    },
  ];
  const readable: QueryDslQueryContainer[] = [
    { term: { 'access_control.access_mode': ConversationAccessControlMode.Public } },
    { bool: { should: owned, minimum_should_match: 1 } },
    ...(reader.id !== undefined
      ? [
          {
            nested: {
              path: 'access_control.entries',
              ignore_unmapped: true,
              query: {
                bool: {
                  filter: [
                    { term: { 'access_control.entries.type': 'user' } },
                    { term: { 'access_control.entries.id': reader.id } },
                  ],
                },
              },
            },
          },
        ]
      : []),
  ];
  return {
    bool: {
      filter: [
        { bool: { should: readable, minimum_should_match: 1 } },
        { terms: { agent_id: agentIds } },
      ],
    },
  };
};

/**
 * The top-level conversations in the space that the reader can list: public, owned, or shared
 * with them, on an agent they can access. Sub-agent conversations are left out.
 */
export const buildConversationReadFilter = ({
  spaceId,
  reader,
  agentIds,
}: {
  spaceId: string;
  reader: ConversationReader;
  agentIds: string[];
}): QueryDslQueryContainer[] => [
  buildSpaceFilter(spaceId),
  buildReadAccessFilter({ reader, agentIds }),
  { bool: { must_not: [{ exists: { field: 'parent_conversation' } }] } },
];
