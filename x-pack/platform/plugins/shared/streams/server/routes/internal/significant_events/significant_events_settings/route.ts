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
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES,
} from '@kbn/management-settings-ids';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { FeatureNotEnabledError } from '../../../../lib/streams/errors/feature_not_enabled_error';
import {
  STREAMS_API_PRIVILEGES,
  MIN_EXTRACTION_INTERVAL_HOURS,
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE,
  DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES,
  DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE,
  MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
  MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
} from '../../../../../common/constants';

const continuousKiExtractionSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  intervalHours: z.number().min(MIN_EXTRACTION_INTERVAL_HOURS).optional(),
  excludedStreamPatterns: z.string().optional(),
});

const scheduledDiscoverySettingsSchema = z.object({
  enabled: z.boolean().optional(),
  detectionIntervalMinutes: z.number().min(MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES).optional(),
  reviewIntervalMinutes: z.number().min(MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES).optional(),
  discoveryBatchSize: z
    .number()
    .min(MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE)
    .max(MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE)
    .optional(),
  triageBatchSize: z
    .number()
    .min(MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE)
    .max(MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE)
    .optional(),
  maxReviewPasses: z
    .number()
    .min(MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES)
    .max(MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES)
    .optional(),
});

const putSignificantEventsSettingsBodySchema = z.object({
  continuousKiExtraction: continuousKiExtractionSettingsSchema.optional(),
  scheduledDiscovery: scheduledDiscoverySettingsSchema.optional(),
});

export const putSignificantEventsSettingsRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/_significant_events/settings',
  options: {
    access: 'internal',
    summary: 'Update Significant Events settings',
    description:
      'Updates Significant Events settings and reconciles the associated workflows when scheduling settings change.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: putSignificantEventsSettingsBodySchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    continuousKiOnboardingWorkflowService,
    significantEventsScheduledDiscoveryWorkflowService,
    getSpaceId,
    logger,
  }): Promise<{ success: true }> => {
    const { licensing, uiSettingsClient, globalUiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { continuousKiExtraction, scheduledDiscovery } = params.body;

    if (continuousKiExtraction && !continuousKiOnboardingWorkflowService) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    if (scheduledDiscovery && !significantEventsScheduledDiscoveryWorkflowService) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    const globalUpdates: Record<string, boolean | number | string> = {};
    const spaceUpdates: Record<string, boolean | number> = {};

    if (continuousKiExtraction?.enabled !== undefined) {
      globalUpdates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED] =
        continuousKiExtraction.enabled;
    }
    if (continuousKiExtraction?.intervalHours !== undefined) {
      globalUpdates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS] =
        continuousKiExtraction.intervalHours;
    }
    if (continuousKiExtraction?.excludedStreamPatterns !== undefined) {
      globalUpdates[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS] =
        continuousKiExtraction.excludedStreamPatterns;
    }

    if (scheduledDiscovery?.enabled !== undefined) {
      spaceUpdates[OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED] =
        scheduledDiscovery.enabled;
    }
    if (scheduledDiscovery?.detectionIntervalMinutes !== undefined) {
      spaceUpdates[
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES
      ] = scheduledDiscovery.detectionIntervalMinutes;
    }
    if (scheduledDiscovery?.reviewIntervalMinutes !== undefined) {
      spaceUpdates[
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES
      ] = scheduledDiscovery.reviewIntervalMinutes;
    }
    if (scheduledDiscovery?.discoveryBatchSize !== undefined) {
      spaceUpdates[
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE
      ] = scheduledDiscovery.discoveryBatchSize;
    }
    if (scheduledDiscovery?.triageBatchSize !== undefined) {
      spaceUpdates[OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE] =
        scheduledDiscovery.triageBatchSize;
    }
    if (scheduledDiscovery?.maxReviewPasses !== undefined) {
      spaceUpdates[OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES] =
        scheduledDiscovery.maxReviewPasses;
    }

    const previousGlobalValues: Record<string, boolean | number | string> = {};
    const previousSpaceValues: Record<string, boolean | number> = {};
    const globalKeys = Object.keys(globalUpdates);
    const spaceKeys = Object.keys(spaceUpdates);
    const [globalSettings, spaceSettings] = await Promise.all([
      globalUiSettingsClient.getAll<boolean | number | string>(),
      uiSettingsClient.getAll<boolean | number>(),
    ]);

    if (globalKeys.length > 0) {
      for (const key of globalKeys) {
        previousGlobalValues[key] = globalSettings[key];
      }
      await globalUiSettingsClient.setMany(globalUpdates);
    }

    if (spaceKeys.length > 0) {
      for (const key of spaceKeys) {
        previousSpaceValues[key] = spaceSettings[key];
      }
      await uiSettingsClient.setMany(spaceUpdates);
    }

    // Only reconcile the workflow on an actual enabled-state transition so the
    // legacy and managed workflows never run at the same time. Interval/excluded
    // changes are picked up by the running workflow at execution time.
    const rollbackSettings = async () => {
      await Promise.all([
        Object.keys(previousGlobalValues).length > 0
          ? globalUiSettingsClient.setMany(previousGlobalValues).catch((rollbackErr) => {
              logger.warn(
                `Failed to rollback global settings after workflow sync error: ${rollbackErr}`
              );
            })
          : Promise.resolve(),
        Object.keys(previousSpaceValues).length > 0
          ? uiSettingsClient.setMany(previousSpaceValues).catch((rollbackErr) => {
              logger.warn(
                `Failed to rollback space settings after workflow sync error: ${rollbackErr}`
              );
            })
          : Promise.resolve(),
      ]);
    };

    try {
      const previousContinuousEnabled =
        (globalSettings[OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED] as boolean) ??
        false;
      const nextContinuousEnabled = continuousKiExtraction?.enabled;

      if (
        nextContinuousEnabled !== undefined &&
        nextContinuousEnabled !== previousContinuousEnabled
      ) {
        const workflowService = continuousKiOnboardingWorkflowService;
        if (!workflowService) {
          throw new FeatureNotEnabledError('Workflows management is not available');
        }

        await workflowService.ensureWorkflow({
          enabled: nextContinuousEnabled,
          request,
        });
      }

      const previousScheduledEnabled =
        (spaceSettings[
          OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
        ] as boolean) ?? false;
      const nextScheduledEnabled = scheduledDiscovery?.enabled ?? previousScheduledEnabled;
      const scheduledEnabledChanged =
        scheduledDiscovery?.enabled !== undefined &&
        scheduledDiscovery.enabled !== previousScheduledEnabled;
      const scheduledConfigChanged =
        scheduledDiscovery !== undefined &&
        Object.keys(spaceUpdates).some(
          (key) => key !== OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
        );

      if (scheduledEnabledChanged || (nextScheduledEnabled && scheduledConfigChanged)) {
        const workflowService = significantEventsScheduledDiscoveryWorkflowService;
        if (!workflowService) {
          throw new FeatureNotEnabledError('Workflows management is not available');
        }

        const spaceId = await getSpaceId(request);
        await workflowService.ensureWorkflow({
          enabled: nextScheduledEnabled,
          request,
          spaceId,
          config: {
            detectionIntervalMinutes:
              (spaceUpdates[
                OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES
              ] as number | undefined) ??
              (spaceSettings[
                OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES
              ] as number | undefined) ??
              DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
            reviewIntervalMinutes:
              (spaceUpdates[
                OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES
              ] as number | undefined) ??
              (spaceSettings[
                OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES
              ] as number | undefined) ??
              DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
            discoveryBatchSize:
              (spaceUpdates[
                OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE
              ] as number | undefined) ??
              (spaceSettings[
                OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE
              ] as number | undefined) ??
              DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE,
            triageBatchSize:
              (spaceUpdates[
                OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE
              ] as number | undefined) ??
              (spaceSettings[
                OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE
              ] as number | undefined) ??
              DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE,
            maxReviewPasses:
              (spaceUpdates[
                OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES
              ] as number | undefined) ??
              (spaceSettings[
                OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES
              ] as number | undefined) ??
              DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES,
          },
        });
      }
    } catch (err) {
      await rollbackSettings();
      throw err;
    }

    return { success: true };
  },
});

export const internalSignificantEventsSettingsRoutes = {
  ...putSignificantEventsSettingsRoute,
};
