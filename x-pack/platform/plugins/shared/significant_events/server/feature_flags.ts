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
  OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS,
  OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_ALERTING_V2,
} from '@kbn/management-settings-ids';
import { DEFAULT_INDEX_PATTERNS } from '@kbn/streams-schema';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  SIGNIFICANT_EVENTS_TUNING_FIELD_BOUNDS,
  validateSignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import type { SignificantEventsPluginStartDependencies } from './types';
import { STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE } from '../common';
import { DEFAULT_EXTRACTION_INTERVAL_HOURS } from '../common/constants';

const sigEventsTuningConfigSchema = schema.object(
  Object.fromEntries(
    Object.entries(SIGNIFICANT_EVENTS_TUNING_FIELD_BOUNDS).map(([key, { min, max }]) => [
      key,
      schema.number({ min, max }),
    ])
  ) as Record<string, ReturnType<typeof schema.number>>,
  {
    validate: (value) => {
      const errors = validateSignificantEventsTuningConfig(value as Record<string, unknown>);
      return errors.length ? errors.join('; ') : undefined;
    },
  }
);

export function registerFeatureFlags(
  core: CoreSetup<SignificantEventsPluginStartDependencies>,
  logger: Logger,
  { isAlertingV2PluginAvailable }: { isAlertingV2PluginAvailable: boolean }
) {
  core.pricing
    .isFeatureAvailable(STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id)
    .then((isSignificantEventsAvailable) => {
      if (isSignificantEventsAvailable) {
        core.uiSettings.register({
          [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: {
            category: ['observability'],
            name: i18n.translate('xpack.significantEvents.significantEventsSettingsName', {
              defaultMessage: 'Streams significant events',
            }) as string,
            value: false,
            description: i18n.translate(
              'xpack.significantEvents.significantEventsSettingsDescription',
              {
                defaultMessage: 'Enable streams significant events.',
              }
            ),
            type: 'boolean',
            schema: schema.boolean(),
            requiresPageReload: true,
            solutionViews: ['classic', 'oblt'],
            technicalPreview: true,
          },
        });

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
          [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY]: {
            category: ['observability'],
            name: i18n.translate('xpack.significantEvents.significantEventsDiscoverySettingsName', {
              defaultMessage: 'Streams significant events discovery',
            }) as string,
            value: false,
            description: i18n.translate(
              'xpack.significantEvents.significantEventsDiscoverySettingsDescription',
              {
                defaultMessage: 'Enable streams significant events discovery.',
              }
            ),
            type: 'boolean',
            schema: schema.boolean(),
            requiresPageReload: true,
            solutionViews: ['classic', 'oblt'],
            technicalPreview: true,
            readonly: true,
            readonlyMode: 'ui',
          },
        });

        if (isAlertingV2PluginAvailable) {
          core.uiSettings.register({
            [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_ALERTING_V2]: {
              category: ['observability'],
              name: i18n.translate(
                'xpack.significantEvents.significantEventsAlertingV2SettingsName',
                {
                  defaultMessage: 'Streams significant events — Alerting v2',
                }
              ) as string,
              value: false,
              description: i18n.translate(
                'xpack.significantEvents.significantEventsAlertingV2SettingsDescription',
                {
                  defaultMessage:
                    'Back significant event queries with Alerting v2 (kind: signal) instead of the custom streams.rules.esql rule type. ' +
                    'Requires the alertingVTwo plugin and the write-alerting-v2-rules privilege. ' +
                    'SigEvents rules are stored in the default Kibana space regardless of the current space. ' +
                    'When disabled, rules are created via Alerting v1 (default). ' +
                    'Turning this ON does not migrate existing v1-backed queries — promote or change queries to create v2 rules. ' +
                    'Reads and writes both require the plugin; flag-on without alertingVTwo keeps v1 rules and v1 alert indices. ' +
                    'Under v2, the discovery histogram buckets on rule evaluation time, not source log time. ' +
                    'Switching this flag causes user-visible data gaps: the discovery view reads from a single index (.alerts-streams.* for v1 or .rule-events for v2) and does not union both, so events generated by the previous engine become invisible until the flag is restored. ' +
                    'Cleanup of orphaned rules on the previous engine relies on a write operation against a SignificantEvent query (promote, update, delete) — this triggers dual cleanup which removes the legacy rule. ' +
                    'If alertingVTwo is uninstalled while v2 rules exist, in-product cleanup becomes a no-op; to clean up, reinstall the plugin and trigger a write on each affected query, or delete the rules directly via the alerting v2 bulk_delete API.',
                }
              ),
              type: 'boolean',
              schema: schema.boolean(),
              requiresPageReload: false,
              solutionViews: ['classic', 'oblt'],
              technicalPreview: true,
              readonly: true,
              readonlyMode: 'ui',
            },
          });
        }

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
