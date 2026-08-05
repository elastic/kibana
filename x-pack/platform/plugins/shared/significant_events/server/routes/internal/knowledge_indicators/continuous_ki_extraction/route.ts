/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
} from '@kbn/management-settings-ids';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../../utils/assert_not_paused';
import { FeatureNotEnabledError } from '../../../../lib/errors/feature_not_enabled_error';
import {
  STREAMS_API_PRIVILEGES,
  MIN_EXTRACTION_INTERVAL_HOURS,
} from '../../../../../common/constants';

const putContinuousKiExtractionSettingsBodySchema = z.object({
  continuousKiExtraction: z.object({
    enabled: z.boolean().optional(),
    intervalHours: z.number().min(MIN_EXTRACTION_INTERVAL_HOURS).optional(),
  }),
});

export const putContinuousKIExtractionSettingsRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/_knowledge_indicators/continuous_ki_extraction/settings',
  options: {
    access: 'internal',
    summary: 'Update continuous KI extraction settings',
    description:
      'Updates continuous KI extraction settings (enabled, interval) and ensures the extraction workflow is created or updated accordingly.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: putContinuousKiExtractionSettingsBodySchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    continuousKiOnboardingWorkflowService,
    maintenanceService,
    logger,
  }): Promise<{ success: true }> => {
    if (!continuousKiOnboardingWorkflowService) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    const { licensing, globalUiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing });

    const { continuousKiExtraction } = params.body;

    // Feature toggles are owned by Pause/Resume while paused — no edits allowed.
    if (
      continuousKiExtraction.enabled !== undefined ||
      continuousKiExtraction.intervalHours !== undefined
    ) {
      await assertNotPaused({ maintenanceService, request });
    }

    const updates: Record<string, boolean | number | string> = {};

    if (continuousKiExtraction.enabled !== undefined) {
      updates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED] =
        continuousKiExtraction.enabled;
    }
    if (continuousKiExtraction.intervalHours !== undefined) {
      updates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS] =
        continuousKiExtraction.intervalHours;
    }

    const previousValues: Record<string, boolean | number | string> = {};
    const keys = Object.keys(updates);
    const allSettings = await globalUiSettingsClient.getAll<boolean | number | string>();
    if (keys.length > 0) {
      for (const key of keys) {
        previousValues[key] = allSettings[key];
      }
      await globalUiSettingsClient.setMany(updates);
    }

    // Only reconcile the workflow on an actual enabled-state transition so the
    // legacy and managed workflows never run at the same time. Interval changes are
    // picked up by the running workflow at execution time.
    const previousEnabled = allSettings[
      OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED
    ] as boolean;
    const nextEnabled = continuousKiExtraction.enabled;

    if (nextEnabled !== undefined && nextEnabled !== previousEnabled) {
      try {
        await continuousKiOnboardingWorkflowService.ensureWorkflow({
          enabled: nextEnabled,
          request,
        });
      } catch (err) {
        if (Object.keys(previousValues).length > 0) {
          await globalUiSettingsClient.setMany(previousValues).catch((rollbackErr) => {
            logger.warn(`Failed to rollback settings after workflow sync error: ${rollbackErr}`);
          });
        }
        throw err;
      }
    }

    return { success: true };
  },
});

export const internalKIContinuousKIExtractionRoutes = {
  ...putContinuousKIExtractionSettingsRoute,
};
