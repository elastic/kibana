/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG,
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
import { DEFAULT_INDEX_PATTERNS } from '@kbn/streams-schema';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  SIGNIFICANT_EVENTS_TUNING_FIELD_BOUNDS,
  validateSignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import type { SignificantEventsPluginStartDependencies } from './types';
import { STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE } from '../common';
import {
  DEFAULT_EXTRACTION_INTERVAL_HOURS,
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE,
  DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES,
  DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE,
  DEFAULT_SIG_EVENTS_TARGET_COVERAGE_MINUTES,
  MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MAX_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
  MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
  MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MIN_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
} from '../common/constants';

// Fields are optional and unknown keys are ignored so that a config persisted
// before a field was added to SIGNIFICANT_EVENTS_TUNING_FIELD_BOUNDS (or after
// one was removed/renamed) doesn't fail schema validation wholesale and get
// silently reset to full defaults. validateSignificantEventsTuningConfig
// already tolerates missing keys, and getSignificantEventsTuningConfig merges
// the stored value with defaults for any that are absent.
const sigEventsTuningConfigSchema = schema.object(
  Object.fromEntries(
    Object.entries(SIGNIFICANT_EVENTS_TUNING_FIELD_BOUNDS).map(([key, { min, max }]) => [
      key,
      schema.maybe(schema.number({ min, max })),
    ])
  ) as Record<string, ReturnType<typeof schema.maybe>>,
  {
    unknowns: 'ignore',
    validate: (value) => {
      const errors = validateSignificantEventsTuningConfig(value as Record<string, unknown>);
      return errors.length ? errors.join('; ') : undefined;
    },
  }
);

export function registerFeatureFlags(
  core: CoreSetup<SignificantEventsPluginStartDependencies>,
  logger: Logger
) {
  core.pricing
    .isFeatureAvailable(STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id)
    .then((isSignificantEventsAvailable) => {
      if (isSignificantEventsAvailable) {
        core.uiSettings.register({
          [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS]: {
            category: ['observability'],
            name: i18n.translate('xpack.significantEvents.sigEventsIndexPatternsSettingsName', {
              defaultMessage: 'Significant Events index patterns',
            }) as string,
            value: DEFAULT_INDEX_PATTERNS,
            description: i18n.translate(
              'xpack.significantEvents.sigEventsIndexPatternsSettingsDescription',
              {
                defaultMessage:
                  'Comma-separated list of index patterns used for Significant Events stream filtering and analysis.',
              }
            ),
            type: 'string',
            schema: schema.string(),
            requiresPageReload: false,
            solutionViews: ['classic', 'oblt'],
            technicalPreview: true,
            readonly: true,
            readonlyMode: 'ui',
          },
        });

        core.uiSettings.register({
          [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: {
            category: ['observability'],
            name: i18n.translate('xpack.significantEvents.scheduledSigEventsDiscoveryEnabledName', {
              defaultMessage: 'Scheduled Significant Events discovery enabled',
            }) as string,
            value: false,
            description: i18n.translate(
              'xpack.significantEvents.scheduledSigEventsDiscoveryEnabledDescription',
              {
                defaultMessage:
                  'When enabled, Significant Events detection, discovery, and triage run automatically in this Kibana space.',
              }
            ),
            type: 'boolean',
            schema: schema.boolean(),
            solutionViews: ['classic', 'oblt'],
            technicalPreview: true,
            readonly: true,
            readonlyMode: 'ui',
          },
          [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]:
            {
              category: ['observability'],
              name: i18n.translate(
                'xpack.significantEvents.scheduledSigEventsDiscoveryDetectionIntervalMinutesName',
                {
                  defaultMessage: 'Scheduled Significant Events detection interval (minutes)',
                }
              ) as string,
              value: DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
              description: i18n.translate(
                'xpack.significantEvents.scheduledSigEventsDiscoveryDetectionIntervalMinutesDescription',
                {
                  defaultMessage:
                    'How often scheduled Significant Events detection runs in this Kibana space.',
                }
              ),
              type: 'number',
              schema: schema.number({ min: MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES }),
              solutionViews: ['classic', 'oblt'],
              technicalPreview: true,
              readonly: true,
              readonlyMode: 'ui',
            },
          [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_BUCKET_INTERVAL_MINUTES]:
            {
              category: ['observability'],
              name: i18n.translate(
                'xpack.significantEvents.scheduledSigEventsDiscoveryDetectionBucketIntervalMinutesName',
                {
                  defaultMessage:
                    'Scheduled Significant Events detection bucket interval (minutes)',
                }
              ) as string,
              value: DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
              description: i18n.translate(
                'xpack.significantEvents.scheduledSigEventsDiscoveryDetectionBucketIntervalMinutesDescription',
                {
                  defaultMessage:
                    'Date-histogram bucket width used by the scheduled Significant Events change-point detection in this Kibana space. Wider buckets smooth out short-term burst noise.',
                }
              ),
              type: 'number',
              schema: schema.number({
                min: MIN_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
                max: MAX_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
              }),
              solutionViews: ['classic', 'oblt'],
              technicalPreview: true,
              readonly: true,
              readonlyMode: 'ui',
            },
          [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_LOOKBACK_MINUTES]:
            {
              category: ['observability'],
              name: i18n.translate(
                'xpack.significantEvents.scheduledSigEventsDiscoveryDetectionLookbackMinutesName',
                {
                  defaultMessage: 'Scheduled Significant Events detection lookback (minutes)',
                }
              ) as string,
              value: DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES,
              description: i18n.translate(
                'xpack.significantEvents.scheduledSigEventsDiscoveryDetectionLookbackMinutesDescription',
                {
                  defaultMessage:
                    'Time window analysed by the scheduled Significant Events change-point detection in this Kibana space. Must be a multiple of the detection bucket interval yielding between 22 and 1000 buckets.',
                }
              ),
              type: 'number',
              schema: schema.number({ min: MIN_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES }),
              solutionViews: ['classic', 'oblt'],
              technicalPreview: true,
              readonly: true,
              readonlyMode: 'ui',
            },
          [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TARGET_COVERAGE_MINUTES]: {
            category: ['observability'],
            name: i18n.translate(
              'xpack.significantEvents.scheduledSigEventsDiscoveryTargetCoverageMinutesName',
              {
                defaultMessage: 'Scheduled Significant Events target coverage (minutes)',
              }
            ) as string,
            value: DEFAULT_SIG_EVENTS_TARGET_COVERAGE_MINUTES,
            description: i18n.translate(
              'xpack.significantEvents.scheduledSigEventsDiscoveryTargetCoverageMinutesDescription',
              {
                defaultMessage:
                  'Every active rule is scanned at least once within this many minutes. Must exceed the detection interval for round-robin to spread the fleet across runs; equal or less scans the whole fleet each run.',
              }
            ),
            type: 'number',
            schema: schema.number({ min: MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES }),
            solutionViews: ['classic', 'oblt'],
            technicalPreview: true,
            readonly: true,
            readonlyMode: 'ui',
          },
          [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES]: {
            category: ['observability'],
            name: i18n.translate(
              'xpack.significantEvents.scheduledSigEventsDiscoveryReviewIntervalMinutesName',
              {
                defaultMessage: 'Scheduled Significant Events review interval (minutes)',
              }
            ) as string,
            value: DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
            description: i18n.translate(
              'xpack.significantEvents.scheduledSigEventsDiscoveryReviewIntervalMinutesDescription',
              {
                defaultMessage:
                  'How often scheduled Significant Events discovery and triage review runs in this Kibana space.',
              }
            ),
            type: 'number',
            schema: schema.number({ min: MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES }),
            solutionViews: ['classic', 'oblt'],
            technicalPreview: true,
            readonly: true,
            readonlyMode: 'ui',
          },
          [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE]: {
            category: ['observability'],
            name: i18n.translate(
              'xpack.significantEvents.scheduledSigEventsDiscoveryDiscoveryBatchSizeName',
              {
                defaultMessage: 'Scheduled Significant Events discovery batch size',
              }
            ) as string,
            value: DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE,
            description: i18n.translate(
              'xpack.significantEvents.scheduledSigEventsDiscoveryDiscoveryBatchSizeDescription',
              {
                defaultMessage:
                  'Maximum detections sent to each scheduled discovery pass in this Kibana space.',
              }
            ),
            type: 'number',
            schema: schema.number({
              min: MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
              max: MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
            }),
            solutionViews: ['classic', 'oblt'],
            technicalPreview: true,
            readonly: true,
            readonlyMode: 'ui',
          },
          [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE]: {
            category: ['observability'],
            name: i18n.translate(
              'xpack.significantEvents.scheduledSigEventsDiscoveryTriageBatchSizeName',
              {
                defaultMessage: 'Scheduled Significant Events triage batch size',
              }
            ) as string,
            value: DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE,
            description: i18n.translate(
              'xpack.significantEvents.scheduledSigEventsDiscoveryTriageBatchSizeDescription',
              {
                defaultMessage:
                  'Maximum discoveries sent to each scheduled triage pass in this Kibana space.',
              }
            ),
            type: 'number',
            schema: schema.number({
              min: MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
              max: MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
            }),
            solutionViews: ['classic', 'oblt'],
            technicalPreview: true,
            readonly: true,
            readonlyMode: 'ui',
          },
          [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES]: {
            category: ['observability'],
            name: i18n.translate(
              'xpack.significantEvents.scheduledSigEventsDiscoveryMaxReviewPassesName',
              {
                defaultMessage: 'Scheduled Significant Events review passes',
              }
            ) as string,
            value: DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES,
            description: i18n.translate(
              'xpack.significantEvents.scheduledSigEventsDiscoveryMaxReviewPassesDescription',
              {
                defaultMessage:
                  'Maximum discovery and triage pass pairs to run during one scheduled review execution in this Kibana space.',
              }
            ),
            type: 'number',
            schema: schema.number({
              min: MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
              max: MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
            }),
            solutionViews: ['classic', 'oblt'],
            technicalPreview: true,
            readonly: true,
            readonlyMode: 'ui',
          },
        });

        core.uiSettings.registerGlobal({
          [OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED]: {
            category: ['observability'],
            name: i18n.translate('xpack.significantEvents.continuousKiExtractionEnabledName', {
              defaultMessage: 'Continuous KI extraction enabled',
            }),
            value: false,
            description: i18n.translate(
              'xpack.significantEvents.continuousKiExtractionEnabledDescription',
              {
                defaultMessage:
                  'When enabled, knowledge indicator extraction runs automatically on managed streams.',
              }
            ),
            type: 'boolean',
            schema: schema.boolean(),
            scope: 'global',
            solutionViews: ['classic', 'oblt'],
            readonly: true,
            readonlyMode: 'ui',
          },
          [OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS]: {
            category: ['observability'],
            name: i18n.translate(
              'xpack.significantEvents.continuousKiExtractionIntervalHoursName',
              {
                defaultMessage: 'Continuous KI extraction interval (hours)',
              }
            ),
            value: DEFAULT_EXTRACTION_INTERVAL_HOURS,
            description: i18n.translate(
              'xpack.significantEvents.continuousKiExtractionIntervalHoursDescription',
              {
                defaultMessage:
                  'How often to run knowledge indicator extraction per stream, in hours.',
              }
            ),
            type: 'number',
            schema: schema.number({ min: 0 }),
            scope: 'global',
            solutionViews: ['classic', 'oblt'],
            readonly: true,
            readonlyMode: 'ui',
          },
          [OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS]: {
            category: ['observability'],
            name: i18n.translate(
              'xpack.significantEvents.continuousKiExtractionExcludedStreamPatternsName',
              {
                defaultMessage: 'Continuous KI extraction excluded streams',
              }
            ),
            value: '',
            description: i18n.translate(
              'xpack.significantEvents.continuousKiExtractionExcludedStreamPatternsDescription',
              {
                defaultMessage:
                  'Comma-separated list of stream names or glob patterns (e.g. logs.debug.*) to exclude from automatic knowledge indicator extraction.',
              }
            ),
            type: 'string',
            schema: schema.string(),
            scope: 'global',
            solutionViews: ['classic', 'oblt'],
            readonly: true,
            readonlyMode: 'ui',
          },
          [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG]: {
            category: ['observability'],
            name: i18n.translate('xpack.significantEvents.sigEventsTuningConfigName', {
              defaultMessage: 'Significant Events tuning',
            }),
            value: JSON.stringify(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG),
            description: i18n.translate(
              'xpack.significantEvents.sigEventsTuningConfigDescription',
              {
                defaultMessage:
                  'JSON configuration for Significant Events tuning parameters including sample sizes, ratios, TTLs, and search thresholds.',
              }
            ),
            type: 'json',
            schema: sigEventsTuningConfigSchema,
            scope: 'global',
            solutionViews: ['classic', 'oblt'],
            readonly: true,
            readonlyMode: 'ui',
          },
        });
      }
    })
    .catch((error) => {
      logger.error(`Failed to register significant events ui settings: ${error}`);
    });
}
