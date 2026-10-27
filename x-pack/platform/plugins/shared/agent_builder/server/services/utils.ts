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
import { serviceAccountUserId, type CurrentUser } from '@kbn/agent-builder-common';
import { resolveApiKeyOwnerProfileUid, toStableUserId } from '@kbn/agent-builder-server';
import { APPLICATION_PREFIX } from '@kbn/security-plugin/common/constants';
import { apiPrivileges } from '../../common/features';

const KIBANA_APPLICATION = `${APPLICATION_PREFIX}.kibana`;

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
  const isAdmin = await isAdminFromRequest({ esClient });
  const authUser = security.authc.getCurrentUser(request);

  const principal = security.authc.getPrincipal(request);
  if (principal?.type === 'service_account') {
    return {
      id: serviceAccountUserId(principal.serviceAccountId),
      // A fake request Kibana minted for the account carries a credential but no stored user.
      username: authUser?.username ?? (await esClient.security.authenticate()).username,
      type: 'service_account',
      isAdmin,
    };
  }

  const resolveApiKeyProfileUid = () =>
    resolveApiKeyOwnerProfileUid({
      apiKeyId: extractApiKeyIdFromAuthzHeader(request.headers.authorization),
      esClient,
    });

  if (authUser?.username) {
    const id = await toStableUserId({ authUser, request, resolveApiKeyProfileUid });

    return { id, username: authUser.username, type: 'user', isAdmin };
  }

  // A user on this path may have a profile that `getCurrentUser` could not see; a realm id would
  // stop matching their profile-owned conversations, whereas username matching still finds them.
  const { username } = await esClient.security.authenticate();
  const id = await toStableUserId({ authUser: authUser ?? {}, request, resolveApiKeyProfileUid });

  return { id, username, type: 'user', isAdmin };
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
