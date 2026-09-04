/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import { PLUGIN_ID } from '../../common';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import type { StartPlugins } from '../types';

/**
 * Osquery API privileges, named exactly as the HTTP routes declare them in
 * `security.authz.requiredPrivileges`.
 *
 * An Agent Builder tool wrapping an Osquery capability is a second entry point
 * to the same data as the route, and Agent Builder does not apply the route's
 * `requiredPrivileges` on its behalf. Each tool therefore has to assert the
 * same privilege its route counterpart declares, or it silently widens access
 * for any user who can reach the agent.
 */
export const OSQUERY_TOOL_PRIVILEGES = {
  /** `POST /api/osquery/live_queries` — dispatching a direct (non saved-query) live query. */
  writeLiveQueries: [`${PLUGIN_ID}-writeLiveQueries`],
  /**
   * `GET /api/osquery/live_queries/{id}/results/{actionId}`. The route accepts
   * only `readLiveQueries`; adding `read` here would widen the tool past it.
   */
  readLiveQueries: [`${PLUGIN_ID}-readLiveQueries`],
  readSavedQueries: [`${PLUGIN_ID}-readSavedQueries`],
  /** `GET /api/osquery/packs` */
  readPacks: [`${PLUGIN_ID}-readPacks`],
  /** `GET /internal/osquery/schemas/osquery` */
  read: [`${PLUGIN_ID}-read`],
} as const;

export type OsqueryToolPrivilege = keyof typeof OSQUERY_TOOL_PRIVILEGES;

/**
 * Returns true when the request holds at least one of the API privileges the
 * corresponding Osquery route requires.
 *
 * Mirrors `hasOsqueryReadPrivilege`: when RBAC is disabled for the request
 * there is nothing to check and access is granted.
 */
export const hasOsqueryToolPrivilege = async (
  osqueryContext: OsqueryAppContext,
  request: KibanaRequest,
  privilege: OsqueryToolPrivilege
): Promise<boolean> => {
  const [, startPlugins] = await osqueryContext.getStartServices();
  const security = (startPlugins as StartPlugins).security;

  if (!security) {
    return false;
  }

  if (!security.authz.mode.useRbacForRequest(request)) {
    return true;
  }

  const { privileges } = await security.authz.checkPrivilegesDynamicallyWithRequest(request)({
    kibana: OSQUERY_TOOL_PRIVILEGES[privilege].map((apiPrivilege) =>
      security.authz.actions.api.get(apiPrivilege)
    ),
  });

  return privileges.kibana.some(({ authorized }) => authorized);
};

/** Standard tool error result for a privilege denial. */
export const unauthorizedToolResult = (privilege: OsqueryToolPrivilege) => ({
  results: [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.error as const,
      data: {
        message: `Insufficient Osquery privileges: this action requires the ${OSQUERY_TOOL_PRIVILEGES[
          privilege
        ].join(' or ')} privilege.`,
      },
    },
  ],
});
