/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import { buildDirectoryListingQuery } from '../../../common/utils/file_system_queries';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { StartPlugins } from '../../types';
import { createActionHandler } from '../../handlers';
import { getUserInfo } from '../../lib/get_user_info';
import { logOsqueryAuditEvent, OsqueryAuditAction } from '../../lib/audit';

/**
 * Internal route that lists one directory level on a single host by dispatching
 * an Osquery `file`-table live query. The path is escaped via the shared
 * string-literal escaper (no raw concatenation). Returns the dispatched action
 * id; the frontend polls the existing live-query results route for rows.
 *
 * Browse requires `osquery.writeLiveQueries` (it dispatches a live query) and is
 * gated behind the `fileSystemViewer` experimental flag — when the flag is off
 * the route is never registered, so it returns 404.
 */
export const listDirectoryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  const logger = osqueryContext.logFactory.get('fileSystemViewer');

  router.versioned
    .post({
      access: 'internal',
      path: '/internal/osquery/file_system/list',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-writeLiveQueries`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: schema.object({
              agentId: schema.string({ minLength: 1 }),
              path: schema.string({ minLength: 1 }),
            }),
          },
        },
      },
      async (context, request, response) => {
        const { agentId, path } = request.body;

        try {
          const [, startPlugins] = await osqueryContext.getStartServices();
          const securityStart = (startPlugins as StartPlugins).security;
          const currentUser = await getUserInfo({ request, security: securityStart, logger });
          const space = await osqueryContext.service.getActiveSpace(request);

          const query = buildDirectoryListingQuery(path);

          const { response: osqueryAction, fleetActionsCount } = await createActionHandler(
            osqueryContext,
            { agent_ids: [agentId], query },
            {
              metadata: {
                currentUser: currentUser?.username ?? undefined,
                userProfileUid: currentUser?.profile_uid ?? undefined,
              },
              space,
            }
          );

          if (!fleetActionsCount) {
            return response.badRequest({
              body: { message: 'No Fleet action was dispatched for the selected host' },
            });
          }

          const coreContext = await context.core;
          logOsqueryAuditEvent(coreContext.security.audit.logger, {
            action: OsqueryAuditAction.FILE_BROWSE,
            agentId,
            path,
            outcome: 'success',
          });

          return response.ok({ body: { data: osqueryAction } });
        } catch (error) {
          const coreContext = await context.core;
          logOsqueryAuditEvent(coreContext.security.audit.logger, {
            action: OsqueryAuditAction.FILE_BROWSE,
            agentId,
            path,
            error: error instanceof Error ? error : new Error(String(error)),
          });

          if (error.statusCode === 400) {
            return response.badRequest({ body: error });
          }

          return response.customError({
            statusCode: error.statusCode ?? 500,
            body: { message: `Error listing directory: ${error.message ?? error}` },
          });
        }
      }
    );
};
