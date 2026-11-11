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
  serviceAccountUserId,
  type CurrentUser,
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
  request,
  resolveApiKeyProfileUid,
}: {
  authUser: StableUserIdAuthUser;
  request: KibanaRequest;
  resolveApiKeyProfileUid: () => Promise<string | undefined>;
}): Promise<string | undefined> => {
  // Fake requests always authenticate with an API key, even when their identity hides it.
  const isApiKey = request.isFakeRequest || authUser.authentication_type === 'api_key';
  let profileUid = authUser.profile_uid;

  if (isApiKey && profileUid === undefined) {
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
 * the API key owner's username does not match the originating user. A fake request authenticates
 * with an API key, so when no profile_uid was attached the id is the key owner's profile uid: the
 * identity Elasticsearch authorizes the run as.
 *
 * For un-enriched fake requests (e.g. tasks scheduled before enrichment was available), we fall
 * back to the ES `_security/_authenticate` API for the username. When it authenticated an API key,
 * the id is the key owner's profile uid, as for an HTTP request made with the same key.
 *
 * Service accounts are recognised first, through `security.authc.getPrincipal`.
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
  const { isAdmin, canManageSecurity } = await getCallerPrivileges({ esClient });
  const authUser = security.authc.getCurrentUser(request);

  const principal = security.authc.getPrincipal(request);
  if (principal?.type === 'service_account') {
    return {
      id: serviceAccountUserId(principal.serviceAccountId),
      // A fake request Kibana minted for the account carries a credential but no stored user.
      username: authUser?.username ?? (await esClient.security.authenticate()).username,
      type: 'service_account',
      isAdmin,
      canManageSecurity,
    };
  }

  const resolveApiKeyProfileUid = () => resolveApiKeyOwnerProfileUid({ request, esClient });

  if (authUser?.username) {
    const id = await toStableUserId({ authUser, request, resolveApiKeyProfileUid });

    return { id, username: authUser.username, type: 'user', isAdmin, canManageSecurity };
  }

  // A user on this path may have a profile that `getCurrentUser` could not see; a realm id would
  // stop matching their profile-owned conversations, whereas username matching still finds them.
  const { username } = await esClient.security.authenticate();
  const id = await toStableUserId({ authUser: authUser ?? {}, request, resolveApiKeyProfileUid });

  return { id, username, type: 'user', isAdmin, canManageSecurity };
};

const ADMIN_PRIVILEGE = 'agent_builder:admin'; // intentionally unregistered privilege
const MANAGE_SECURITY_PRIVILEGE = 'manage_security';

export interface CallerPrivileges {
  /** Wildcard Elasticsearch privileges (for example `superuser`). */
  isAdmin: boolean;
  /** The `manage_security` cluster privilege, which gates service account bindings. */
  canManageSecurity: boolean;
}

/**
 * Resolves the caller's platform-level privileges with a single `has_privileges` call.
 *
 * Admin is checked against an application privilege name that is not registered by Kibana
 * (`agent_builder:admin`). Because it is unregistered, normal roles fail this check while wildcard
 * roles (for example application/cluster `*`/`all`) pass, which gives an internal admin check
 * independent of feature/sub-feature grants.
 */
export const getCallerPrivileges = async ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): Promise<CallerPrivileges> => {
  try {
    const response = await esClient.security.hasPrivileges({
      cluster: [MANAGE_SECURITY_PRIVILEGE],
      application: [
        {
          application: KIBANA_APPLICATION,
          resources: ['*'],
          privileges: [ADMIN_PRIVILEGE],
        },
      ],
    });

    return {
      isAdmin: response.application?.[KIBANA_APPLICATION]?.['*']?.[ADMIN_PRIVILEGE] ?? false,
      canManageSecurity: response.cluster?.[MANAGE_SECURITY_PRIVILEGE] ?? false,
    };
  } catch {
    return { isAdmin: false, canManageSecurity: false };
  }
};

/**
 * Returns `true` only for users with wildcard Elasticsearch privileges (for example `superuser`).
 */
export const isAdminFromRequest = async ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): Promise<boolean> => (await getCallerPrivileges({ esClient })).isAdmin;

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
