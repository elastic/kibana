/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { UserIdAndName } from '@kbn/agent-builder-common';
import { APPLICATION_PREFIX } from '@kbn/security-plugin/common/constants';
import { apiPrivileges } from '../../common/features';

const KIBANA_APPLICATION = `${APPLICATION_PREFIX}.kibana`;

/**
 * Resolves the current user from a request.
 *
 * For real HTTP requests, `security.authc.getCurrentUser` returns the authenticated user
 * (including profile_uid and username).
 *
 * For fake requests (e.g. from Task Manager using an API key), `getCurrentUser` returns null.
 * In that case, we fall back to the ES `_security/_authenticate` API, which works with API keys
 * and returns the username of the API key owner.
 */
export const getUserFromRequest = async ({
  request,
  security,
  esClient,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  esClient: ElasticsearchClient;
}): Promise<UserIdAndName> => {
  if (!request.isFakeRequest) {
    const authUser = security.authc.getCurrentUser(request);
    if (authUser) {
      return { id: authUser.profile_uid!, username: authUser.username };
    }
  }

  // Fallback for fake requests (e.g. Task Manager execution): call ES _security/_authenticate
  const authResponse = await esClient.security.authenticate();
  return { username: authResponse.username };
};

const VISIBILITY_ACCESS_OVERRIDE_PRIVILEGE = 'agent_builder:visibility_access_override'; // intentionally unregistered privilege

/**
 * Returns `true` only for users with wildcard Elasticsearch privileges (for example `superuser`).
 *
 * We intentionally check an application privilege name that is not registered by Kibana
 * (`agent_builder:visibility_access_override`). Because this privilege is unregistered, normal
 * roles fail this check, while wildcard roles (for example application/cluster `*`/`all`) pass.
 *
 * This is used as an internal visibility-access override, independent of feature/sub-feature
 * grants.
 */
export const hasVisibilityAccessOverrideFromRequest = async ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): Promise<boolean> => {
  const { has_all_requested: hasVisibilityAccessOverride } = await esClient.security.hasPrivileges({
    application: [
      {
        application: KIBANA_APPLICATION,
        resources: ['*'],
        privileges: [VISIBILITY_ACCESS_OVERRIDE_PRIVILEGE],
      },
    ],
  });

  return hasVisibilityAccessOverride;
};

export const getAgentApiAccessFromRequest = async ({
  esClient,
  space,
}: {
  esClient: ElasticsearchClient;
  space: string;
}): Promise<{ canReadAgents: boolean; canManageAgents: boolean }> => {
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
