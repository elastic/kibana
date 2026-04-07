/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { API_BASE_PATH, QUERY_ACTIVITY_WRITE_PRIVILEGE } from '../../common/constants';
import type { RouteOptions } from '.';

export const registerCancelRoute = ({ router, logger }: RouteOptions) => {
  router.post(
    {
      path: `${API_BASE_PATH}/cancel`,
      security: {
        authz: {
          requiredPrivileges: [QUERY_ACTIVITY_WRITE_PRIVILEGE],
        },
      },
      validate: {
        body: schema.object({
          taskId: schema.string({ minLength: 1 }),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      const { taskId } = request.body;

      try {
        const coreContext = await context.core;

        // In ESS, verify the user has the ES manage cluster privilege before proceeding.
        // In Serverless, security?.hasPrivileges is absent so the check is silently skipped —
        // POST /_tasks/_cancel is an internal-only API that requires operator-level access there,
        // and Kibana RBAC (requiredPrivileges above) is the authorization gate.
        const esPrivileges =
          await coreContext.elasticsearch.client.asCurrentUser.security?.hasPrivileges?.({
            cluster: ['manage'],
          });
        if (esPrivileges && !esPrivileges.cluster?.manage) {
          return response.forbidden({
            body: { message: 'Insufficient privileges to cancel query' },
          });
        }

        // asInternalUser is intentional: in Serverless, POST /_tasks/_cancel is an internal-only
        // API that requires operator-level access. Kibana RBAC (requiredPrivileges above) is the
        // authorization gate; the pre-flight hasPrivileges check above enforces ES privileges in ESS.
        const esClient = coreContext.elasticsearch.client.asInternalUser;

        const result = await esClient.tasks.cancel({
          task_id: taskId,
          wait_for_completion: false,
        });

        return response.ok({ body: result });
      } catch (error) {
        const statusCode =
          (error as { statusCode?: number; meta?: { statusCode?: number } })?.statusCode ??
          (error as { statusCode?: number; meta?: { statusCode?: number } })?.meta?.statusCode;

        // If the task is already completed/removed, treat as success so the action is idempotent.
        if (statusCode === 404) {
          return response.ok({ body: { acknowledged: true } });
        }

        if (statusCode === 403) {
          return response.forbidden({
            body: { message: 'Insufficient privileges to cancel query' },
          });
        }

        logger.error(`Failed to cancel query activity task "${taskId}": ${error}`);
        return response.customError({
          statusCode: statusCode ?? 500,
          body: { message: 'Failed to cancel query' },
        });
      }
    }
  );
};
