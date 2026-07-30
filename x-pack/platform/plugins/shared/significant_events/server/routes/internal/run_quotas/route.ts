/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { badRequest } from '@hapi/boom';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import {
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  RUN_BUDGET_GROUP_IDS,
  type RunQuotaSettings,
  type RunQuotasResponse,
} from '../../../../common';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

const runLimitSchema = z.object({
  enabled: z.boolean(),
  max: z.number().int().min(MIN_RUN_LIMIT).max(MAX_RUN_LIMIT),
});

const budgetGroupSchema = z.enum(RUN_BUDGET_GROUP_IDS);

const getRunQuotasRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/run_quotas',
  options: {
    access: 'internal',
    summary: 'Get Significant Events daily run limits and usage',
    description:
      'Returns the configured daily run limit per budget group (KI extraction, memory, detection, investigation) together with how many runs the current window has already used and when it resets. Deployment-wide, like the maintenance state.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    server,
    getScopedClients,
    runQuotaService,
  }): Promise<RunQuotasResponse> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    return runQuotaService.getQuotas();
  },
});

const updateRunQuotasRoute = createServerRoute({
  endpoint: 'PUT /internal/significant_events/run_quotas',
  options: {
    access: 'internal',
    summary: 'Update Significant Events daily run limits',
    description:
      'Sets the daily run limit per budget group and the time zone the daily window is anchored to. Omitted groups keep their current value. Limits are enforced inside the counted workflows, so a change takes effect after the managed workflows are reinstalled (triggered by this call). ' +
      'Deployment-wide, gated by the same space-scoped streams.manage privilege as the other Significant Events settings.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      timezone: z.string().max(64).optional(),
      limits: z.partialRecord(budgetGroupSchema, runLimitSchema).optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    server,
    getScopedClients,
    runQuotaService,
  }): Promise<RunQuotaSettings> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    const updatedBy = server.core.security.authc.getCurrentUser(request)?.username;
    try {
      return await runQuotaService.updateSettings({
        request,
        update: params.body,
        updatedBy,
      });
    } catch (error) {
      // An unknown time zone is caller error, not a server fault.
      if (error instanceof Error && error.message.startsWith('Unknown time zone')) {
        throw badRequest(error.message);
      }
      throw error;
    }
  },
});

export const internalRunQuotasRoutes = {
  ...getRunQuotasRoute,
  ...updateRunQuotasRoute,
};
