/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { assertCanManageSignificantEventsGlobally } from '../../../lib/run_quotas/privileges';
import {
  createCostTrackingAuditRepository,
  createSpaceTrackingAccess,
  setTokenUsageTrackingInAllSpaces,
} from '../../../lib/cost/space_coverage';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

const getCostRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/cost',
  options: {
    access: 'internal',
    summary: 'Get Significant Events approximate list-price cost',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({}),
  handler: async ({ request, server, getScopedClients, getSpaceId, costService }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    await assertCanManageSignificantEventsGlobally({
      request,
      server,
      message: 'Viewing deployment-wide cost requires Streams manage in all spaces',
    });
    return costService.getCost({
      request,
      server,
      currentSpaceId: await getSpaceId(request),
    });
  },
});

const putTokenUsageTrackingRoute = createServerRoute({
  endpoint: 'PUT /internal/significant_events/cost/token_usage_tracking',
  options: {
    access: 'internal',
    summary: 'Set AI token usage tracking in every space',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      enabled: z.boolean(),
    }),
  }),
  handler: async ({ params, request, server, getScopedClients, costService, logger }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    await assertCanManageSignificantEventsGlobally({
      request,
      server,
      message: 'Changing deployment-wide token tracking requires Streams manage in all spaces',
    });
    let result: Awaited<ReturnType<typeof setTokenUsageTrackingInAllSpaces>>;
    try {
      result = await setTokenUsageTrackingInAllSpaces({
        access: createSpaceTrackingAccess({
          coreStart: server.core,
          spaces: server.spaces,
          request,
        }),
        auditRepository: createCostTrackingAuditRepository(server.core),
        enabled: params.body.enabled,
        changedBy: server.core.security.authc.getCurrentUser(request)?.username ?? 'unknown',
      });
    } finally {
      costService.invalidate();
    }
    if (result.failedSpaces.length > 0) {
      logger.warn(
        `Token usage tracking update failed in ${
          result.failedSpaces.length
        } spaces: ${result.failedSpaces.map(({ id }) => id).join(', ')}`
      );
    }
    return {
      enabled: result.enabled,
      updatedSpaceIds: result.updatedSpaceIds,
      failedSpaces: result.failedSpaces,
    };
  },
});

export const internalCostRoutes = {
  ...getCostRoute,
  ...putTokenUsageTrackingRoute,
};
