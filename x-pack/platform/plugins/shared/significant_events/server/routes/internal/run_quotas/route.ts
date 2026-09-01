/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED } from '@kbn/management-settings-ids';
import type { RunBudgetGroupId, RunLimit } from '../../../../common/run_quotas';
import {
  DEFAULT_RUN_LIMITS,
  MAX_RUN_LIMIT,
  RUN_BUDGET_GROUP_IDS,
} from '../../../../common/run_quotas';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import {
  RUN_QUOTA_LEDGER_SO_TYPE,
  countRunQuotaWorkflowExecutions,
  createRunQuotaInternalRepository,
  createRunQuotaExecutionReader,
  dayKey,
  getRunQuotaLedgerId,
  mutateRunQuotaSettings,
  readRunQuotaSettings,
  reserveInvestigationRunQuota,
  resolveDailyWindow,
  consumeRunQuota,
  type RunQuotaLedgerAttributes,
  type RunQuotaSavedObjectsRepository,
} from '../../../lib/run_quotas';
import { assertCanManageRunQuotas, canManageRunQuotas } from '../../../lib/run_quotas/privileges';

const MAX_ROUTE_ID_LENGTH = 1024;

const runLimitSchema = z.discriminatedUnion('enabled', [
  z.object({ enabled: z.literal(false), max: z.literal(0) }),
  z.object({ enabled: z.literal(true), max: z.number().int().min(1).max(MAX_RUN_LIMIT) }),
]);

const limitsPatchSchema = z
  .object({
    detection: runLimitSchema.optional(),
    investigation: runLimitSchema.optional(),
    ki_extraction: runLimitSchema.optional(),
  })
  .refine((limits) => Object.values(limits).some((limit) => limit !== undefined));

const readLedger = async (
  internalRepository: RunQuotaSavedObjectsRepository,
  date: string,
  group: RunBudgetGroupId
): Promise<RunQuotaLedgerAttributes | undefined> => {
  try {
    const savedObject = await internalRepository.get<RunQuotaLedgerAttributes>(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId(date, group)
    );
    return savedObject.attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
      return undefined;
    }
    throw error;
  }
};

const resolveKnownLimits = (limits: Record<string, RunLimit>) =>
  Object.fromEntries(
    RUN_BUDGET_GROUP_IDS.map((group) => [group, limits[group] ?? DEFAULT_RUN_LIMITS[group]])
  ) as Record<RunBudgetGroupId, RunLimit>;

const getRunQuotasRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/run_quotas',
  options: {
    access: 'internal',
    summary: 'Get Significant Events daily run limits and usage',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({ request, server, getScopedClients, logger }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const internalRepository = createRunQuotaInternalRepository(server);
    const settings = await readRunQuotaSettings(internalRepository);
    const limits = resolveKnownLimits(settings.limits);
    const window = resolveDailyWindow();
    const date = dayKey(window);
    const [ledgers, displayCounts] = await Promise.all([
      Promise.all(RUN_BUDGET_GROUP_IDS.map((group) => readLedger(internalRepository, date, group))),
      countRunQuotaWorkflowExecutions({
        esClient: server.core.elasticsearch.client.asInternalUser,
        window,
      }).catch((error) => {
        logger.warn(
          `Failed to read workflow execution counts for run quotas: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        throw error;
      }),
    ]);

    return {
      settings: {
        limits,
      },
      window,
      groups: RUN_BUDGET_GROUP_IDS.map((group, index) => {
        const ledger = ledgers[index];
        const counted = ledger?.count ?? 0;
        const limit = limits[group];
        return {
          group,
          limit,
          used: displayCounts[group],
          counted,
          remaining: limit.enabled ? Math.max(0, limit.max - counted) : null,
          criticalOverrideCount: ledger?.criticalOverrideCount ?? 0,
        };
      }),
    };
  },
});

const putRunQuotasRoute = createServerRoute({
  endpoint: 'PUT /internal/significant_events/run_quotas',
  options: {
    access: 'internal',
    summary: 'Update Significant Events daily run limits',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      limits: limitsPatchSchema,
    }),
  }),
  handler: async ({
    params,
    request,
    server,
    getScopedClients,
    continuousKiOnboardingWorkflowService,
  }) => {
    const { licensing, globalUiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    await assertCanManageRunQuotas({ request, server });
    const internalRepository = createRunQuotaInternalRepository(server);
    const currentSettings = await readRunQuotaSettings(internalRepository);
    const previousKiLimit =
      currentSettings.limits.ki_extraction ?? DEFAULT_RUN_LIMITS.ki_extraction;
    const nextKiLimit = params.body.limits.ki_extraction;
    if (
      currentSettings.enforcementEnabled &&
      nextKiLimit?.enabled &&
      !previousKiLimit.enabled &&
      (await globalUiSettingsClient.get<boolean>(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED
      ))
    ) {
      if (!continuousKiOnboardingWorkflowService) {
        throw new Error('Workflows management is required to cap continuous KI onboarding');
      }
      await continuousKiOnboardingWorkflowService.ensureCappedContinuousKiScheduled({
        request,
      });
    }
    const actor = server.core.security.authc.getCurrentUser(request)?.username;
    const now = new Date().toISOString();
    await mutateRunQuotaSettings(internalRepository, () => ({
      limits: params.body.limits,
      updatedAt: now,
      ...(actor ? { updatedBy: actor } : {}),
    }));
  },
});

const enforcementRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/run_quotas/_enforcement',
  options: {
    access: 'internal',
    summary: 'Enable or disable Significant Events daily run-limit enforcement',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      enabled: z.boolean(),
      limits: limitsPatchSchema.optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    server,
    getScopedClients,
    continuousKiOnboardingWorkflowService,
  }) => {
    const { licensing, globalUiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    await assertCanManageRunQuotas({ request, server });
    const internalRepository = createRunQuotaInternalRepository(server);
    const currentSettings = await readRunQuotaSettings(internalRepository);
    const nextKiLimit =
      params.body.limits?.ki_extraction ??
      currentSettings.limits.ki_extraction ??
      DEFAULT_RUN_LIMITS.ki_extraction;
    if (
      params.body.enabled &&
      nextKiLimit.enabled &&
      (await globalUiSettingsClient.get<boolean>(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED
      ))
    ) {
      if (!continuousKiOnboardingWorkflowService) {
        throw new Error('Workflows management is required to cap continuous KI onboarding');
      }
      await continuousKiOnboardingWorkflowService.ensureCappedContinuousKiScheduled({
        request,
      });
    }
    const actor = server.core.security.authc.getCurrentUser(request)?.username;
    const now = new Date().toISOString();
    const settings = await mutateRunQuotaSettings(internalRepository, () => ({
      enforcementEnabled: params.body.enabled,
      ...(params.body.limits ? { limits: params.body.limits } : {}),
      ...(params.body.enabled
        ? {
            enabledAt: now,
            ...(actor ? { enabledBy: actor } : {}),
          }
        : {}),
      updatedAt: now,
      ...(actor ? { updatedBy: actor } : {}),
    }));
    return { enabled: settings.enforcementEnabled === true };
  },
});

const consumeRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/run_quotas/_consume',
  options: {
    access: 'internal',
    summary: 'Consume one verified Significant Events worker grant',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    query: z.object({
      group: z.enum(['detection', 'ki_extraction']),
    }),
    body: z.object({
      executionId: z.string().max(MAX_ROUTE_ID_LENGTH),
    }),
  }),
  handler: async ({ params, request, server, getScopedClients, getSpaceId, logger }) => {
    const { licensing, scopedClusterClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const routeLogger = logger.get('run_quotas', params.query.group);
    try {
      return await consumeRunQuota({
        internalRepository: createRunQuotaInternalRepository(server),
        executionReader: createRunQuotaExecutionReader(scopedClusterClient.asInternalUser),
        request,
        executionId: params.body.executionId,
        group: params.query.group,
        spaceId: await getSpaceId(request),
      });
    } catch (error) {
      routeLogger.warn(
        `Run quota consumption failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  },
});

const reserveInvestigationRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/run_quotas/investigation/_reserve',
  options: {
    access: 'internal',
    summary: 'Reserve one verified automated investigation grant',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      executionId: z.string().max(MAX_ROUTE_ID_LENGTH),
      eventId: z.string().max(MAX_ROUTE_ID_LENGTH),
      eventUuid: z.string().max(MAX_ROUTE_ID_LENGTH),
    }),
  }),
  handler: async ({ params, request, server, getScopedClients, getSpaceId, logger }) => {
    const { licensing, scopedClusterClient, getEventClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing });
    const routeLogger = logger.get('run_quotas', 'investigation');
    try {
      return await reserveInvestigationRunQuota({
        internalRepository: createRunQuotaInternalRepository(server),
        executionReader: createRunQuotaExecutionReader(scopedClusterClient.asInternalUser),
        eventResolver: getEventClient(),
        request,
        executionId: params.body.executionId,
        eventId: params.body.eventId,
        eventUuid: params.body.eventUuid,
        spaceId: await getSpaceId(request),
        actor: server.core.security.authc.getCurrentUser(request)?.username ?? 'unknown',
        logger: routeLogger,
      });
    } catch (error) {
      routeLogger.warn(
        `Investigation run quota reservation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  },
});

const statusRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/run_quotas/_status',
  options: {
    access: 'internal',
    summary: 'Get Significant Events run-limit enforcement status',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({ request, server, getScopedClients }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const settings = await readRunQuotaSettings(createRunQuotaInternalRepository(server));
    const canManageLimits = await canManageRunQuotas({ request, server });
    const enabled = settings.enforcementEnabled === true;

    return {
      enabled,
      ...(enabled && canManageLimits && settings.enabledAt
        ? { enabledAt: settings.enabledAt }
        : {}),
      ...(enabled && canManageLimits && settings.enabledBy
        ? { enabledBy: settings.enabledBy }
        : {}),
      canManageLimits,
    };
  },
});

export const internalRunQuotaRoutes = {
  ...getRunQuotasRoute,
  ...putRunQuotasRoute,
  ...enforcementRoute,
  ...consumeRoute,
  ...reserveInvestigationRoute,
  ...statusRoute,
};
