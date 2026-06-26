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
import { logOsqueryAuditEvent, OsqueryAuditAction } from '../../lib/audit';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

/**
 * Internal route that emits a FILE_RETRIEVE audit event when the frontend
 * dispatches a get-file or run-script act-verb directly to the Endpoint API.
 *
 * Because act-verbs are sent directly to `/api/endpoint/action/*` (not through
 * an osquery server route), this thin endpoint is the only place we can produce
 * the Osquery-flavoured audit record. It performs no action other than writing the
 * audit log and returning 200.
 *
 * Requires `osquery-writeLiveQueries` — the same privilege already needed to
 * browse the file system, which guards the Files tab.
 */
export const auditRetrieveRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .post({
      access: 'internal',
      path: '/internal/osquery/file_system/audit_retrieve',
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
              endpointId: schema.string({ minLength: 1 }),
              path: schema.string({ minLength: 1 }),
              actionType: schema.oneOf([schema.literal('get_file'), schema.literal('run_script')]),
            }),
          },
        },
      },
      async (context, request, response) => {
        const { agentId, path, actionType } = request.body;

        const coreContext = await context.core;

        logOsqueryAuditEvent(coreContext.security.audit.logger, {
          action: OsqueryAuditAction.FILE_RETRIEVE,
          agentId,
          path,
          outcome: 'success',
          message: `User dispatched Endpoint ${actionType} for file via the Osquery Files tab`,
        });

        return response.ok({ body: { acknowledged: true } });
      }
    );
};
