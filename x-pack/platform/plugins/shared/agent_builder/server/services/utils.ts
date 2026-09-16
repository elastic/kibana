/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  extractApiKeyIdFromAuthzHeader,
  HTTPAuthorizationHeader,
  isUiamCredential,
  type SecurityServiceStart,
} from '@kbn/core-security-server';
import type { CurrentUser } from '@kbn/agent-builder-common';
import { APPLICATION_PREFIX } from '@kbn/security-plugin/common/constants';
import { apiPrivileges } from '../../common/features';

const KIBANA_APPLICATION = `${APPLICATION_PREFIX}.kibana`;

interface StableUserIdAuthUser {
  username?: string;
  profile_uid?: string;
  authentication_type?: string;
  authentication_realm?: { type?: string; name?: string };
}

/**
 * Builds a stable principal id for Agent Builder ownership checks.
 *
 * Usernames alone are not unique across Elasticsearch authentication realms
 * (e.g. file vs native). Prefer the Kibana user profile uid when present;
 * otherwise encode realm type/name with the username so same-username
 * principals in different realms remain distinct.
 *
 * The `realm:` prefix keeps synthetic ids distinguishable from profile uids.
 */
export const toStableUserId = async ({
  authUser,
  resolveApiKeyProfileUid,
}: {
  authUser: StableUserIdAuthUser;
  resolveApiKeyProfileUid?: () => Promise<string | undefined>;
}): Promise<string | undefined> => {
  const isApiKey = authUser.authentication_type === 'api_key';
  let profileUid = authUser.profile_uid;

  if (isApiKey && profileUid === undefined && resolveApiKeyProfileUid) {
    profileUid = await resolveApiKeyProfileUid();
  }

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

  return `realm:${JSON.stringify([realmType, realmName, username])}`;
};

/**
 * Resolves the API key creator's profile uid, when available.
 *
 * `getCurrentUser` for API-key auth often omits `profile_uid`. For native Elasticsearch
 * API keys, looking up the key with `with_profile_uid` recovers the creator's profile so
 * ownership can match interactive sessions for the same user.
 *
 * Serverless UIAM credentials (`essu_…`) are not stored in Elasticsearch, so
 * `GET _security/api_key` returns an empty `api_keys` list (a non-403 miss). Those
 * keys must not go through getApiKey. The already-scoped client can still call
 * `authenticate()`; org/workflow UIAM keys often have no profile, in which case we
 * return undefined and callers fall back to username matching.
 *
 * Empty results, 404s, and any other getApiKey/authenticate miss return undefined
 * rather than throwing — matching Security `getCurrentUserProfileIdViaApiKey`.
 */
const resolveApiKeyOwnerProfileUid = async ({
  request,
  esClient,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
}): Promise<string | undefined> => {
  const authorization = HTTPAuthorizationHeader.parseFromRequest(request);
  if (authorization && isUiamCredential(authorization)) {
    try {
      // `profile_uid` is not in the ES `_security/_authenticate` response type, but UIAM may
      // populate it at runtime; read it as an optional widened field.
      const authResponse = await esClient.security.authenticate();
      return (authResponse as typeof authResponse & { profile_uid?: string }).profile_uid;
    } catch {
      return undefined;
    }
  }

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
  } catch {
    return undefined;
  }
};

/**
 * Resolves the current user from a request.
 *
 * For real HTTP requests, `security.authc.getCurrentUser` returns the authenticated user
 * (including profile_uid, username, and authentication_realm).
 *
 * For fake requests (e.g. from Task Manager using an API key), `getCurrentUser` returns the
 * originating user's identity when the request was enriched at schedule time (profile_uid and
 * username persisted on the task's userScope). This is required for Cross-Project Search, where
 * the API key owner's username does not match the originating user.
 *
 * For un-enriched fake requests (e.g. tasks scheduled before enrichment was available), we fall
 * back to the ES `_security/_authenticate` API for the username only.
 */
export const getUserFromRequest = async ({
  request,
  security,
  esClient,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  esClient: ElasticsearchClient;
}): Promise<CurrentUser> => {
  const authUser = security.authc.getCurrentUser(request);
  const isAdmin = await isAdminFromRequest({ esClient });

  if (authUser?.username) {
    return {
      id: await toStableUserId({
        authUser,
        resolveApiKeyProfileUid: () => resolveApiKeyOwnerProfileUid({ request, esClient }),
      }),
      username: authUser.username,
      isAdmin,
    };
  }

  const authResponse = await esClient.security.authenticate();
  return {
    id: authUser?.profile_uid,
    username: authResponse.username,
    isAdmin,
  };
};

const ADMIN_PRIVILEGE = 'agent_builder:admin'; // intentionally unregistered privilege

/**
 * Returns `true` only for users with wildcard Elasticsearch privileges (for example `superuser`).
 *
 * We intentionally check an application privilege name that is not registered by Kibana
 * (`agent_builder:admin`). Because this privilege is unregistered, normal roles fail this check,
 * while wildcard roles (for example application/cluster `*`/`all`) pass.
 *
 * This is used as an internal admin check, independent of feature/sub-feature grants.
 */
export const isAdminFromRequest = async ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): Promise<boolean> => {
  try {
    const { has_all_requested: isAdmin } = await esClient.security.hasPrivileges({
      application: [
        {
          application: KIBANA_APPLICATION,
          resources: ['*'],
          privileges: [ADMIN_PRIVILEGE],
        },
      ],
    });

    return isAdmin;
  } catch {
    return false;
  }
};

export const getAgentApiAccessFromRequest = async ({
  esClient,
  space,
}: {
  esClient: ElasticsearchClient;
  space: string;
}): Promise<{
  canReadAgents: boolean;
  canManageAgents: boolean;
}> => {
  const resource = `space:${space}`;
  const response = await esClient.security.hasPrivileges({
    application: [
      {
        application: KIBANA_APPLICATION,
        resources: [resource],
        privileges: [apiPrivileges.readAgentBuilder, apiPrivileges.manageAgents],
      },
    ],
  });
  const applicationPrivileges = response.application?.[KIBANA_APPLICATION]?.[resource];
  const canReadAgents = applicationPrivileges?.[apiPrivileges.readAgentBuilder] ?? false;
  const canManageAgents = applicationPrivileges?.[apiPrivileges.manageAgents] ?? false;

  return { canReadAgents, canManageAgents };
};
