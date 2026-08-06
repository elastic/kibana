/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { RUN_QUOTA_ENGINE_IDS } from '../../../../common/run_quotas/types';
import type {
  EngineMaintenanceReason,
  SignificantEventsMaintenanceStatus,
  SignificantEventsMaintenanceSummary,
} from '../../../../common/maintenance/types';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

const engineIdSchema = z.enum(RUN_QUOTA_ENGINE_IDS);
const engineReasonSchema = z.enum(['user', 'run_quota'] as const);

const pauseRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/maintenance/_pause',
  options: {
    access: 'internal',
    summary: 'Pause Significant Events activity',
    description:
      'With no body: disables all managed workflows/rules (global pause). ' +
      'With engines: stops automation workflows for the listed engines only — manual runs stay available. ' +
      'Idempotent while paused. Deployment-wide control gated by streams.manage.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z
      .object({
        /** Engines to pause. Empty / absent = global pause. */
        engines: z.array(engineIdSchema).max(RUN_QUOTA_ENGINE_IDS.length).optional(),
        /** Reason to record on the engine entry (default `user`). */
        reason: engineReasonSchema.optional(),
      })
      .optional(),
  }),
  handler: async ({
    params,
    request,
    server,
    getScopedClients,
    maintenanceService,
  }): Promise<SignificantEventsMaintenanceSummary> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    const updatedBy = server.core.security.authc.getCurrentUser(request)?.username;
    return maintenanceService.pause({
      request,
      updatedBy,
      engines: params?.body?.engines as Array<(typeof RUN_QUOTA_ENGINE_IDS)[number]> | undefined,
      reason: params?.body?.reason as EngineMaintenanceReason | undefined,
    });
  },
});

const resumeRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/maintenance/_resume',
  options: {
    access: 'internal',
    summary: 'Resume Significant Events activity',
    description:
      'With no body: re-enables all recorded workflows/rules (global resume). ' +
      'With engines + reasons: only resumes engines whose pause reason matches. ' +
      'Deployment-wide, gated by streams.manage.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z
      .object({
        /** Engines to resume. Empty / absent = global resume. */
        engines: z.array(engineIdSchema).max(RUN_QUOTA_ENGINE_IDS.length).optional(),
        /** Only resume engines paused for one of these reasons. */
        reasons: z.array(engineReasonSchema).max(2).optional(),
      })
      .optional(),
  }),
  handler: async ({
    params,
    request,
    server,
    getScopedClients,
    maintenanceService,
  }): Promise<SignificantEventsMaintenanceSummary> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    const updatedBy = server.core.security.authc.getCurrentUser(request)?.username;
    return maintenanceService.resume({
      request,
      updatedBy,
      engines: params?.body?.engines as Array<(typeof RUN_QUOTA_ENGINE_IDS)[number]> | undefined,
      reasons: params?.body?.reasons as EngineMaintenanceReason[] | undefined,
    });
  },
});

const statusRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/maintenance/_status',
  options: {
    access: 'internal',
    summary: 'Get Significant Events maintenance status',
    description:
      'Returns the current maintenance state of Significant Events activity (e.g. enabled or paused).',
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
    maintenanceService,
  }): Promise<SignificantEventsMaintenanceStatus> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    return maintenanceService.getStatus({ request });
  },
});

export const internalMaintenanceRoutes = {
  ...pauseRoute,
  ...resumeRoute,
  ...statusRoute,
};
