/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  type RunQuotasResponse,
} from '../../../../common/run_quotas';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import {
  assertCanManageRunQuotas,
  canManageRunQuotas,
  consumeRunQuota,
  createRunQuotaInternalRepository,
  dayKey,
  patchRunQuotaSettings,
  readRunQuotaLedger,
  readRunQuotaSettings,
  resolveDailyWindow,
  type RunQuotaSavedObjectsRepository,
  type RunQuotaSettingsAttributes,
} from '../../../lib/run_quotas';

const limitsUpdateSchema = z
  .object({
    detection: z.number().int().min(MIN_RUN_LIMIT).max(MAX_RUN_LIMIT).optional(),
    investigation: z.number().int().min(MIN_RUN_LIMIT).max(MAX_RUN_LIMIT).optional(),
    ki_extraction: z.number().int().min(MIN_RUN_LIMIT).max(MAX_RUN_LIMIT).optional(),
  })
  .strict()
  .refine((limits) => Object.values(limits).some((limit) => limit !== undefined), {
    message: 'At least one run limit is required',
  });

const settingsUpdateSchema = z
  .object({
    enabled: z.boolean().optional(),
    limits: limitsUpdateSchema.optional(),
  })
  .strict()
  .refine((update) => update.enabled !== undefined || update.limits !== undefined, {
    message: 'At least one run quota setting is required',
  });

const consumeRequestSchema = z.discriminatedUnion('group', [
  z.object({ group: z.literal('detection') }).strict(),
  z.object({ group: z.literal('ki_extraction') }).strict(),
  z.object({ group: z.literal('investigation'), critical: z.boolean() }).strict(),
]);

const readRunQuotaSnapshot = async ({
  internalRepository,
  settings,
  now,
  canManage,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  settings: RunQuotaSettingsAttributes;
  now: Date;
  canManage: boolean;
}): Promise<RunQuotasResponse> => {
  const window = resolveDailyWindow(now);
  const date = dayKey(window);
  const [detection, investigation, kiExtraction] = await Promise.all([
    readRunQuotaLedger(internalRepository, date, 'detection'),
    readRunQuotaLedger(internalRepository, date, 'investigation'),
    readRunQuotaLedger(internalRepository, date, 'ki_extraction'),
  ]);

  return {
    enabled: settings.enabled,
    limits: {
      detection: settings.limits.detection,
      investigation: settings.limits.investigation,
      ki_extraction: settings.limits.ki_extraction,
    },
    counts: {
      detection: detection.count,
      investigation: investigation.count,
      ki_extraction: kiExtraction.count,
    },
    window,
    canManage,
  };
};

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
  handler: async ({ request, server, getScopedClients }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const now = new Date();
    const internalRepository = createRunQuotaInternalRepository(server);
    const [settings, canManage] = await Promise.all([
      readRunQuotaSettings(internalRepository),
      canManageRunQuotas({ request, server }),
    ]);

    return readRunQuotaSnapshot({ internalRepository, settings, now, canManage });
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
    body: settingsUpdateSchema,
  }),
  handler: async ({ params, request, server, getScopedClients }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    await assertCanManageRunQuotas({ request, server });
    const now = new Date();
    const internalRepository = createRunQuotaInternalRepository(server);
    const settings = await patchRunQuotaSettings(internalRepository, params.body);

    return readRunQuotaSnapshot({
      internalRepository,
      settings,
      now,
      canManage: true,
    });
  },
});

const consumeRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/run_quotas/_consume',
  options: {
    access: 'internal',
    summary: 'Consume one Significant Events scheduled run quota',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: consumeRequestSchema,
  }),
  handler: async ({ params, request, server, getScopedClients }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const allowOverLimit = params.body.group === 'investigation' && params.body.critical;

    return consumeRunQuota({
      internalRepository: createRunQuotaInternalRepository(server),
      group: params.body.group,
      allowOverLimit,
    });
  },
});

export const internalRunQuotaRoutes = {
  ...getRunQuotasRoute,
  ...putRunQuotasRoute,
  ...consumeRoute,
};
