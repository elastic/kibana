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
  DEFAULT_RUN_QUOTA_SETTINGS,
  MAX_RUN_LIMIT,
  RUN_BUDGET_GROUP_IDS,
} from '../../../../common/run_quotas';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import {
  RUN_QUOTA_LEDGER_SO_TYPE,
  RUN_QUOTA_HOUSEKEEPING_INTERVAL_MS,
  applyRunQuotaSettingsApplicabilityTransition,
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
  updateRunQuotaHeartbeatMaxTimestamp,
  validateHeartbeatProvenance,
  type RunQuotaLedgerAttributes,
  type RunQuotaSavedObjectsRepository,
} from '../../../lib/run_quotas';
import { assertCanManageRunQuotas, canManageRunQuotas } from '../../../lib/run_quotas/privileges';

const MAX_ROUTE_ID_LENGTH = 1024;
const SKIPPED_ROWS_LIMIT = 200;

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
        timezone: DEFAULT_RUN_QUOTA_SETTINGS.timezone,
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
          withinLimitGrantCount: ledger?.withinLimitGrantCount ?? 0,
          criticalPastLimitGrantCount: ledger?.criticalPastLimitGrantCount ?? 0,
          totalSkipped: ledger?.totalSkipped ?? 0,
          decisionsEvicted: ledger?.decisionsEvicted ?? false,
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
    await mutateRunQuotaSettings(internalRepository, (current) => {
      const transitionedGroups = Object.entries(params.body.limits).flatMap(([group, limit]) =>
        limit &&
        limit.enabled !==
          (current.limits[group]?.enabled ?? DEFAULT_RUN_LIMITS[group as RunBudgetGroupId].enabled)
          ? [group as RunBudgetGroupId]
          : []
      );
      return applyRunQuotaSettingsApplicabilityTransition({
        current,
        patch: {
          limits: params.body.limits,
          updatedAt: now,
          ...(actor ? { updatedBy: actor } : {}),
        },
        global: false,
        groups: transitionedGroups,
        changedAt: now,
      });
    });
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
    const settings = await mutateRunQuotaSettings(internalRepository, (current) => {
      const transitionedGroups = Object.entries(params.body.limits ?? {}).flatMap(
        ([group, limit]) =>
          limit &&
          limit.enabled !==
            (current.limits[group]?.enabled ??
              DEFAULT_RUN_LIMITS[group as RunBudgetGroupId].enabled)
            ? [group as RunBudgetGroupId]
            : []
      );
      return applyRunQuotaSettingsApplicabilityTransition({
        current,
        patch: {
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
        },
        global: current.enforcementEnabled !== params.body.enabled,
        groups: transitionedGroups,
        changedAt: now,
      });
    });
    return { enabled: settings.enforcementEnabled === true };
  },
});

const heartbeatRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/run_quotas/_heartbeat',
  options: {
    access: 'internal',
    summary: 'Record a verified Significant Events scheduled-driver heartbeat',
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
    const routeLogger = logger.get('run_quotas', 'heartbeat');
    try {
      const spaceId = await getSpaceId(request);
      const { recordedAt } = await validateHeartbeatProvenance({
        request,
        executionId: params.body.executionId,
        group: params.query.group,
        spaceId,
        executionReader: createRunQuotaExecutionReader(scopedClusterClient.asInternalUser),
      });
      const result = await updateRunQuotaHeartbeatMaxTimestamp({
        internalRepository: createRunQuotaInternalRepository(server),
        group: params.query.group,
        spaceId,
        driverExecutionId: params.body.executionId,
        recordedAt,
      });
      return { recorded: result.recorded };
    } catch (error) {
      routeLogger.warn(
        `Run quota heartbeat failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
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
    const limits = resolveKnownLimits(settings.limits);
    const housekeepingFresh =
      settings.lastHousekeepingAt !== undefined &&
      Date.now() - Date.parse(settings.lastHousekeepingAt) <=
        RUN_QUOTA_HOUSEKEEPING_INTERVAL_MS * 2;
    const getPersistedHealth = (group: 'detection' | 'ki_extraction') => {
      const health = settings.driverHealth?.[group];
      if (!housekeepingFresh || !health) {
        return { status: 'unknown' as const };
      }
      return {
        status: health.status,
        ...(health.staleSpaceIds
          ? {
              staleSpaceCount: health.staleSpaceIds.length,
              ...(canManageLimits ? { staleSpaceIds: health.staleSpaceIds } : {}),
            }
          : {}),
      };
    };

    return {
      enabled,
      ...(enabled && canManageLimits && settings.enabledAt
        ? { enabledAt: settings.enabledAt }
        : {}),
      ...(enabled && canManageLimits && settings.enabledBy
        ? { enabledBy: settings.enabledBy }
        : {}),
      canManageLimits,
      driverHealth: {
        detection: {
          ...(enabled && limits.detection.enabled
            ? getPersistedHealth('detection')
            : { status: 'not_applicable' as const }),
        },
        investigation: { status: 'not_applicable' },
        ki_extraction: {
          ...(enabled && limits.ki_extraction.enabled
            ? getPersistedHealth('ki_extraction')
            : { status: 'not_applicable' as const }),
        },
        memory: { status: 'not_applicable' },
      },
    };
  },
});

const skippedRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/run_quotas/_skipped',
  options: {
    access: 'internal',
    summary: 'Get denied investigation requests for the current space',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      date: z
        .string()
        .max(10)
        .regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  }),
  handler: async ({ params, request, server, getScopedClients, getSpaceId }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const ledger = await readLedger(
      createRunQuotaInternalRepository(server),
      params.query.date,
      'investigation'
    );
    if (!ledger) {
      return {
        rows: [],
        totalSkipped: 0,
        truncated: false,
        decisionsEvicted: false,
      };
    }
    const spaceId = await getSpaceId(request);
    const rows = ledger.skipped
      .filter((row) => row.spaceId === spaceId)
      .sort((left, right) => right.decidedAt.localeCompare(left.decidedAt));

    return {
      rows: rows.slice(0, SKIPPED_ROWS_LIMIT).map(({ spaceId: _spaceId, ...row }) => row),
      totalSkipped: ledger.totalSkipped,
      truncated: rows.length > SKIPPED_ROWS_LIMIT,
      decisionsEvicted: ledger.decisionsEvicted,
    };
  },
});

export const internalRunQuotaRoutes = {
  ...getRunQuotasRoute,
  ...putRunQuotasRoute,
  ...enforcementRoute,
  ...heartbeatRoute,
  ...consumeRoute,
  ...reserveInvestigationRoute,
  ...statusRoute,
  ...skippedRoute,
};
