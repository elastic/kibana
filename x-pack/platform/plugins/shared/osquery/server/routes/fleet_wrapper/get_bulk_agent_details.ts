/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { IRouter } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

/**
 * Request body schema for bulk agent details endpoint.
 * Fetches agent metadata (names, IDs) for multiple agents in a single request.
 */
const GetBulkAgentDetailsRequestBody = z.object({
  agentIds: z.array(z.string()).min(1).max(1000), // Limit to 1000 agents per request (supports up to 10 pages of 100)
});

export const getBulkAgentDetailsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .post({
      access: 'internal',
      path: '/internal/osquery/fleet_wrapper/agents/_bulk',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-read`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(GetBulkAgentDetailsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const logger = osqueryContext.logFactory.get('bulkAgentDetails');
        const space = await osqueryContext.service.getActiveSpace(request);

        // Deduplicate agent IDs to prevent redundant queries
        const agentIds = [...new Set(request.body.agentIds)];

        try {
          // Use Fleet's bulk getByIds method (with ignoreMissing to handle deleted agents)
          const agentService = osqueryContext.service.getAgentService();
          if (!agentService) {
            return response.ok({ body: { agents: [] } });
          }

          const agents = await agentService
            .asInternalScopedUser(space?.id ?? DEFAULT_SPACE_ID)
            ?.getByIds(agentIds, { ignoreMissing: true });

          return response.ok({
            body: {
              agents: agents || [],
            },
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`Failed to fetch bulk agent details: ${errorMessage}`);

          return response.customError({
            statusCode: 500,
            body: {
              message: 'Failed to fetch agent details',
            },
          });
        }
      }
    );
};
