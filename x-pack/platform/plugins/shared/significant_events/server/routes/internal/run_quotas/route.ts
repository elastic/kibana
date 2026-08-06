/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import {
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  RUN_BUDGET_GROUP_IDS,
  type RunQuotaEnforcementResult,
  type RunQuotaSettings,
  type RunQuotasResponse,
} from '../../../../common';
import { enforceRunQuotas } from '../../../lib/run_quotas';
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
      'Sets the daily run limit per budget group. Omitted groups keep their current value. Limits are soft: the next enforcement pass picks the new value up, so raising a limit un-pauses an engine and lowering one pauses it within a few minutes. ' +
      'Deployment-wide, gated by the same space-scoped streams.manage privilege as the other Significant Events settings.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    // timezone is intentionally absent: the daily window is always UTC and
    // is not configurable (settled product decision 2026-08-06).
    body: z.object({
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
    return runQuotaService.updateSettings({
      request,
      update: params.body,
      updatedBy,
    });
  },
});

const enforceRunQuotasRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/run_quotas/_enforce',
  options: {
    access: 'internal',
    summary: 'Reconcile engine pause state with daily run quotas',
    description:
      'Pauses the automation of any engine whose budget group is over its daily limit, and resumes engines that are back within limit (day rollover, or a raised limit). ' +
      'Called on a timer by the run-quota enforce workflow; idempotent, and a no-op when usage cannot be read.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    server,
    logger,
    getScopedClients,
    runQuotaService,
    maintenanceService,
  }): Promise<RunQuotaEnforcementResult> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    return enforceRunQuotas({
      request,
      runQuotaService,
      maintenanceService,
      logger,
      updatedBy: 'system:run_quota_enforce',
    });
  },
});

export const internalRunQuotasRoutes = {
  ...getRunQuotasRoute,
  ...updateRunQuotasRoute,
  ...enforceRunQuotasRoute,
};
