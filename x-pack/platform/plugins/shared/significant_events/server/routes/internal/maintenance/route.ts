/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED } from '@kbn/management-settings-ids';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { DEFAULT_RUN_LIMITS } from '../../../../common/run_quotas';
import type {
  SignificantEventsMaintenanceStatus,
  SignificantEventsMaintenanceSummary,
} from '../../../../common/maintenance/types';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
  type SignificantEventsMaintenanceStateAttributes,
} from '../../../lib/maintenance/saved_object';
import {
  applyRunQuotaSettingsApplicabilityTransition,
  createRunQuotaInternalRepository,
  mutateRunQuotaSettings,
  readRunQuotaSettings,
} from '../../../lib/run_quotas';
import { assertCanManageRunQuotas } from '../../../lib/run_quotas/privileges';

const pauseRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/maintenance/_pause',
  options: {
    access: 'internal',
    summary: 'Pause Significant Events activity',
    description:
      'Disables all Significant Events managed workflows across every Kibana space, cancels their in-flight executions, and disables the alerting rules backing knowledge indicator queries. Existing data is kept. Idempotent while paused. ' +
      'This is a deployment-wide control (agnostic saved object), not per-space. Authorization uses the caller’s space-scoped streams.manage privilege; there is no separate cluster-level privilege today — treat manage as sufficient to pause the whole deployment.',
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
    getScopedClients,
    maintenanceService,
  }): Promise<SignificantEventsMaintenanceSummary> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    if ((await maintenanceService.getState({ request })) !== 'paused') {
      const changedAt = new Date().toISOString();
      await mutateRunQuotaSettings(createRunQuotaInternalRepository(server), (current) =>
        applyRunQuotaSettingsApplicabilityTransition({
          current,
          patch: {},
          global: true,
          groups: [],
          changedAt,
        })
      );
    }
    const updatedBy = server.core.security.authc.getCurrentUser(request)?.username;
    return maintenanceService.pause({ request, updatedBy });
  },
});

const resumeRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/maintenance/_resume',
  options: {
    access: 'internal',
    summary: 'Resume Significant Events activity',
    description:
      'Re-enables the managed workflows and alerting rules that Pause disabled across the deployment. Does not restart cancelled executions. Idempotent while enabled. ' +
      'Deployment-wide (same privilege model as Pause): space-scoped streams.manage gates the call.',
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
    getScopedClients,
    maintenanceService,
    continuousKiOnboardingWorkflowService,
  }): Promise<SignificantEventsMaintenanceSummary> => {
    const { licensing, globalUiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const maintenanceState = await maintenanceService.getState({ request });

    const runQuotaSettings = await readRunQuotaSettings(createRunQuotaInternalRepository(server));
    const kiLimit = runQuotaSettings.limits.ki_extraction ?? DEFAULT_RUN_LIMITS.ki_extraction;
    let continuousKiWillBeEnabled = await globalUiSettingsClient.get<boolean>(
      OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED
    );
    if (!continuousKiWillBeEnabled) {
      const maintenanceRepository = server.core.savedObjects.createInternalRepository([
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
      ]);
      try {
        const maintenanceStateSavedObject =
          await maintenanceRepository.get<SignificantEventsMaintenanceStateAttributes>(
            SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
            SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID
          );
        continuousKiWillBeEnabled =
          maintenanceStateSavedObject.attributes.pausedSettings?.continuousOnboardingWasEnabled ===
          true;
      } catch (error) {
        if (
          !SavedObjectsErrorHelpers.isNotFoundError(
            error as Parameters<typeof SavedObjectsErrorHelpers.isNotFoundError>[0]
          )
        ) {
          throw error;
        }
      }
    }
    const shouldReconcileContinuousKi =
      runQuotaSettings.enforcementEnabled && kiLimit.enabled && continuousKiWillBeEnabled;
    if (shouldReconcileContinuousKi) {
      await assertCanManageRunQuotas({ request, server });
      if (!continuousKiOnboardingWorkflowService) {
        throw new Error('Workflows management is required to cap continuous KI onboarding');
      }
    }

    if (maintenanceState !== 'enabled') {
      const changedAt = new Date().toISOString();
      await mutateRunQuotaSettings(createRunQuotaInternalRepository(server), (current) =>
        applyRunQuotaSettingsApplicabilityTransition({
          current,
          patch: {},
          global: true,
          groups: [],
          changedAt,
        })
      );
    }
    const updatedBy = server.core.security.authc.getCurrentUser(request)?.username;
    const summary = await maintenanceService.resume({ request, updatedBy });
    if (shouldReconcileContinuousKi) {
      await continuousKiOnboardingWorkflowService?.ensureCappedContinuousKiScheduled({
        request,
      });
    }
    return summary;
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
