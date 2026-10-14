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
import type { CurrentUser } from '@kbn/agent-builder-common';
import { errors } from '@elastic/elasticsearch';
import { APPLICATION_PREFIX } from '@kbn/security-plugin/common/constants';
import { apiPrivileges } from '../../common/features';

const KIBANA_APPLICATION = `${APPLICATION_PREFIX}.kibana`;

interface StableUserIdAuthUser {
  username?: string;
  profile_uid?: string;
  authentication_type?: string;
}

/**
 * Resolves the Kibana user profile uid Agent Builder identifies the caller by. There is no
 * fallback to usernames or synthetic ids: a caller without a profile has no id.
 */
export const toStableUserId = async ({
  authUser,
  request,
  resolveApiKeyProfileUid,
}: {
  authUser: StableUserIdAuthUser;
  request?: KibanaRequest;
  resolveApiKeyProfileUid?: () => Promise<string | undefined>;
}): Promise<string | undefined> => {
  // A profile uid attached to the request is always the preferred identity.
  if (authUser.profile_uid) {
    return authUser.profile_uid;
  }

  // API key auth, including fake requests whose identity hides it: use the key owner's profile uid.
  if (request?.isFakeRequest || authUser.authentication_type === 'api_key') {
    return resolveApiKeyProfileUid?.();
  }

  // Other auth without a profile, e.g. basic credentials: no id rather than a username or realm id.
  return undefined;
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
 * For real HTTP requests, `security.authc.getCurrentUser` returns the authenticated user. API key
 * requests without a profile_uid resolve the key owner's; other callers without one have no id.
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
  const resolveApiKeyProfileUid = () => resolveApiKeyOwnerProfileUid({ request, esClient });

  // Real requests, and fake requests enriched with the scheduling user's identity.
  if (authUser?.username) {
    return {
      id: await toStableUserId({ authUser, request, resolveApiKeyProfileUid }),
      username: authUser.username,
      isAdmin,
    };
  }

  const { username, authentication_type: authenticationType } =
    await esClient.security.authenticate();

  // Un-enriched fake requests: Elasticsearch reports who the request authenticated as.
  return {
    id: await toStableUserId({
      authUser: {
        username,
        profile_uid: authUser?.profile_uid,
        authentication_type: authenticationType,
      },
      request,
      resolveApiKeyProfileUid,
    }),
    username,
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
