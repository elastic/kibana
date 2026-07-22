/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_BUCKET_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_LOOKBACK_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TARGET_COVERAGE_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES,
} from '@kbn/management-settings-ids';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { FeatureNotEnabledError } from '../../../lib/errors/feature_not_enabled_error';
import { StatusError } from '../../../lib/errors/status_error';
import { installDiscoveryAgents } from '../../../agent_builder/agents/discovery';
import {
  STREAMS_API_PRIVILEGES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE,
  DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES,
  DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE,
  DEFAULT_SIG_EVENTS_TARGET_COVERAGE_MINUTES,
  MAX_SIG_EVENTS_CHANGE_POINT_BUCKETS,
  MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MAX_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
  MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
  MIN_SIG_EVENTS_CHANGE_POINT_BUCKETS,
  MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MIN_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
} from '../../../../common/constants';

const scheduledDiscoverySettingsSchema = z.object({
  enabled: z.boolean().optional(),
  detectionIntervalMinutes: z.number().min(MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES).optional(),
  detectionBucketIntervalMinutes: z
    .number()
    .min(MIN_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES)
    .max(MAX_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES)
    .optional(),
  detectionLookbackMinutes: z
    .number()
    .min(MIN_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES)
    .optional(),
  targetCoverageMinutes: z.number().min(MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES).optional(),
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

const putScheduledDiscoverySettingsBodySchema = z.object({
  scheduledDiscovery: scheduledDiscoverySettingsSchema,
});

// Maps each numeric `scheduledDiscovery` config field to its per-space UI setting
// id and the default applied when neither the request nor the stored settings
// provide a value. Drives both persistence and workflow config resolution below
// so the field/setting-id/default triple lives in exactly one place.
const SCHEDULED_DISCOVERY_NUMERIC_SETTINGS = {
  detectionIntervalMinutes: {
    settingId:
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
  },
  detectionBucketIntervalMinutes: {
    settingId:
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_BUCKET_INTERVAL_MINUTES,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
  },
  detectionLookbackMinutes: {
    settingId:
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_LOOKBACK_MINUTES,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES,
  },
  targetCoverageMinutes: {
    settingId: OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TARGET_COVERAGE_MINUTES,
    defaultValue: DEFAULT_SIG_EVENTS_TARGET_COVERAGE_MINUTES,
  },
  reviewIntervalMinutes: {
    settingId: OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
  },
  discoveryBatchSize: {
    settingId: OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE,
  },
  triageBatchSize: {
    settingId: OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE,
  },
  maxReviewPasses: {
    settingId: OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES,
    defaultValue: DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES,
  },
} as const;

type ScheduledDiscoveryNumericField = keyof typeof SCHEDULED_DISCOVERY_NUMERIC_SETTINGS;

export const putScheduledDiscoverySettingsRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/_significant_events/scheduled_discovery/settings',
  options: {
    access: 'internal',
    summary: 'Update scheduled Significant Events discovery settings',
    description:
      'Updates per-space scheduled Significant Events discovery settings and reconciles the associated workflows when the scheduling settings change.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: putScheduledDiscoverySettingsBodySchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    significantEventsScheduledWorkflowsService,
    getSpaceId,
    logger,
  }): Promise<{ success: true }> => {
    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    const workflowService = significantEventsScheduledWorkflowsService;
    if (!workflowService) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    const { scheduledDiscovery } = params.body;

    const spaceUpdates: Record<string, boolean | number> = {};

    if (scheduledDiscovery.enabled !== undefined) {
      spaceUpdates[OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED] =
        scheduledDiscovery.enabled;
    }
    for (const field of Object.keys(
      SCHEDULED_DISCOVERY_NUMERIC_SETTINGS
    ) as ScheduledDiscoveryNumericField[]) {
      const value = scheduledDiscovery[field];
      if (value !== undefined) {
        spaceUpdates[SCHEDULED_DISCOVERY_NUMERIC_SETTINGS[field].settingId] = value;
      }
    }

    const previousSpaceValues: Record<string, boolean | number> = {};
    const spaceKeys = Object.keys(spaceUpdates);
    const spaceSettings = await uiSettingsClient.getAll<boolean | number>();

    if (spaceKeys.length > 0) {
      for (const key of spaceKeys) {
        previousSpaceValues[key] = spaceSettings[key];
      }
    }

    // Resolve a scheduled discovery config value, preferring the incoming request,
    // then the stored per-space setting, then the built-in default.
    const resolveScheduledConfigValue = (field: ScheduledDiscoveryNumericField): number => {
      const { settingId, defaultValue } = SCHEDULED_DISCOVERY_NUMERIC_SETTINGS[field];
      return (
        (spaceUpdates[settingId] as number | undefined) ??
        (spaceSettings[settingId] as number | undefined) ??
        defaultValue
      );
    };

    // The change_point aggregation only works on between MIN and MAX buckets, so
    // the detection lookback must be an exact multiple of the bucket interval and
    // the resulting bucket count must stay inside those bounds. Validate the
    // resolved pair (request value, stored setting, or default) so a partial
    // update can't combine into an invalid detection configuration.
    const resolvedBucketIntervalMinutes = resolveScheduledConfigValue(
      'detectionBucketIntervalMinutes'
    );
    const resolvedLookbackMinutes = resolveScheduledConfigValue('detectionLookbackMinutes');
    if (resolvedLookbackMinutes % resolvedBucketIntervalMinutes !== 0) {
      throw new StatusError(
        `detectionLookbackMinutes (${resolvedLookbackMinutes}) must be an exact multiple of detectionBucketIntervalMinutes (${resolvedBucketIntervalMinutes})`,
        400
      );
    }
    const detectionBucketCount = resolvedLookbackMinutes / resolvedBucketIntervalMinutes;
    if (
      detectionBucketCount < MIN_SIG_EVENTS_CHANGE_POINT_BUCKETS ||
      detectionBucketCount > MAX_SIG_EVENTS_CHANGE_POINT_BUCKETS
    ) {
      throw new StatusError(
        `detectionLookbackMinutes (${resolvedLookbackMinutes}) divided by detectionBucketIntervalMinutes (${resolvedBucketIntervalMinutes}) must yield between ${MIN_SIG_EVENTS_CHANGE_POINT_BUCKETS} and ${MAX_SIG_EVENTS_CHANGE_POINT_BUCKETS} buckets, got ${detectionBucketCount}`,
        400
      );
    }

    const rollbackSettings = async () => {
      if (Object.keys(previousSpaceValues).length === 0) {
        return;
      }
      await uiSettingsClient.setMany(previousSpaceValues).catch((rollbackErr) => {
        logger.warn(`Failed to rollback space settings after workflow sync error: ${rollbackErr}`);
      });
    };

    try {
      // Persist the settings inside the try so a partial write failure is reverted
      // by rollbackSettings() alongside a downstream workflow reconciliation failure.
      if (spaceKeys.length > 0) {
        await uiSettingsClient.setMany(spaceUpdates);
      }

      // Reconcile the per-space workflows on an enabled-state transition, and also
      // on a config change while enabled so the rendered workflow templates pick up
      // the new cadence and batch sizes.
      const previousEnabled =
        (spaceSettings[
          OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
        ] as boolean) ?? false;
      const nextEnabled = scheduledDiscovery.enabled ?? previousEnabled;
      const enabledChanged =
        scheduledDiscovery.enabled !== undefined && scheduledDiscovery.enabled !== previousEnabled;
      const configChanged = Object.keys(spaceUpdates).some(
        (key) => key !== OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
      );

      if (enabledChanged || (nextEnabled && configChanged)) {
        const spaceId = await getSpaceId(request);
        if (nextEnabled) {
          if (!server.agentBuilder) {
            throw new Error(
              'Agent Builder is required to enable significant events scheduled discovery'
            );
          }
          await installDiscoveryAgents({ agentBuilder: server.agentBuilder, spaceId });
        }
        await workflowService.ensureWorkflow({
          enabled: nextEnabled,
          request,
          spaceId,
          config: {
            detectionIntervalMinutes: resolveScheduledConfigValue('detectionIntervalMinutes'),
            detectionBucketIntervalMinutes: resolvedBucketIntervalMinutes,
            detectionLookbackMinutes: resolvedLookbackMinutes,
            targetCoverageMinutes: resolveScheduledConfigValue('targetCoverageMinutes'),
            reviewIntervalMinutes: resolveScheduledConfigValue('reviewIntervalMinutes'),
            discoveryBatchSize: resolveScheduledConfigValue('discoveryBatchSize'),
            triageBatchSize: resolveScheduledConfigValue('triageBatchSize'),
            maxReviewPasses: resolveScheduledConfigValue('maxReviewPasses'),
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

export const internalScheduledDiscoveryRoutes = {
  ...putScheduledDiscoverySettingsRoute,
};
