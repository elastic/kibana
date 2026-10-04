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
  type SecurityServiceStart,
} from '@kbn/core-security-server';
import {
  REALM_USER_ID_PREFIX,
  SERVICE_ACCOUNT_ID_PREFIX,
  type CurrentUser,
  type UserPrincipalType,
} from '@kbn/agent-builder-common';
import { errors } from '@elastic/elasticsearch';
import { APPLICATION_PREFIX } from '@kbn/security-plugin/common/constants';
import { apiPrivileges } from '../../common/features';

const KIBANA_APPLICATION = `${APPLICATION_PREFIX}.kibana`;

interface StableUserIdAuthUser {
  username?: string;
  profile_uid?: string;
  authentication_type?: string;
  authentication_realm?: { type?: string; name?: string };
}

/** Elasticsearch's realm for its own service accounts. */
const SERVICE_ACCOUNT_REALM_TYPE = '_service_account';

const isServiceAccountPrincipal = (authUser: StableUserIdAuthUser): boolean =>
  authUser.authentication_realm?.type === SERVICE_ACCOUNT_REALM_TYPE;

const principalTypeOf = (authUser: StableUserIdAuthUser): UserPrincipalType =>
  isServiceAccountPrincipal(authUser) ? 'service_account' : 'user';

/**
 * Builds a stable principal id for Agent Builder ownership checks.
 *
 * Usernames alone are not unique across Elasticsearch authentication realms
 * (e.g. file vs native). Prefer the Kibana user profile uid when present;
 * otherwise encode realm type/name with the username so same-username
 * principals in different realms remain distinct.
 *
 * Synthetic ids carry `SERVICE_ACCOUNT_ID_PREFIX` or `REALM_USER_ID_PREFIX`, which is what
 * `isUserProfileId` keys off to keep them out of user profile lookups.
 */
export const toStableUserId = async ({
  authUser,
  resolveApiKeyProfileUid,
}: {
  authUser: StableUserIdAuthUser;
  resolveApiKeyProfileUid?: () => Promise<string | undefined>;
}): Promise<string | undefined> => {
  // Elasticsearch reports the `<namespace>/<name>` principal as the username, which is already
  // unique and is the id the security plugin uses for the account. Service accounts have no user
  // profile, so this comes before any lookup.
  if (isServiceAccountPrincipal(authUser) && authUser.username) {
    return `${SERVICE_ACCOUNT_ID_PREFIX}${authUser.username}`;
  }

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

  return `${REALM_USER_ID_PREFIX}${JSON.stringify([realmType, realmName, username])}`;
};

/**
 * Resolves the API key creator's profile uid via Elasticsearch, when available.
 *
 * `getCurrentUser` for API-key auth often omits `profile_uid`. Looking up the key with
 * `with_profile_uid` recovers the creator's profile so ownership can match interactive
 * sessions for the same user. Older keys or creators without an activated profile return
 * undefined and callers fall back to username matching.
 */
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
 * For un-enriched fake requests (e.g. tasks scheduled before enrichment was available), and for
 * requests Kibana created itself against a service account, we fall back to the ES
 * `_security/_authenticate` API, which reports the realm as well as the username.
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
      type: principalTypeOf(authUser),
      isAdmin,
    };
  }

  // Only service accounts get a synthesized id here. A user on this path may have a profile that
  // `getCurrentUser` could not see, and a realm id would stop matching their profile-owned
  // conversations, whereas username matching still finds them.
  const authResponse = await esClient.security.authenticate();
  return {
    id:
      authUser?.profile_uid ??
      (isServiceAccountPrincipal(authResponse)
        ? await toStableUserId({ authUser: authResponse })
        : undefined),
    username: authResponse.username,
    type: principalTypeOf(authResponse),
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
