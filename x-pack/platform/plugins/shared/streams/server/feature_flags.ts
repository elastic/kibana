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
  OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS,
  OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS,
  OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS,
  OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS,
  OBSERVABILITY_STREAMS_ENABLE_OVERVIEW_PAGE,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS,
  OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS,
} from '@kbn/management-settings-ids';
import { DEFAULT_INDEX_PATTERNS } from '@kbn/streams-schema';
import type { StreamsPluginStartDependencies } from './types';
import { STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE } from '../common';
import { DEFAULT_EXTRACTION_INTERVAL_HOURS } from '../common/constants';

export function registerFeatureFlags(
  core: CoreSetup<StreamsPluginStartDependencies>,
  logger: Logger
) {
  core.pricing
    .isFeatureAvailable(STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id)
    .then((isSignificantEventsAvailable) => {
      if (isSignificantEventsAvailable) {
        core.uiSettings.register({
          [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: {
            category: ['observability'],
            name: i18n.translate('xpack.streams.significantEventsSettingsName', {
              defaultMessage: 'Streams significant events',
            }) as string,
            value: false,
            description: i18n.translate('xpack.streams.significantEventsSettingsDescription', {
              defaultMessage: 'Enable streams significant events.',
            }),
            type: 'boolean',
            schema: schema.boolean(),
            requiresPageReload: true,
            solutionViews: ['classic', 'oblt'],
            technicalPreview: true,
          },
        });

        core.uiSettings.register({
          [OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS]: {
            category: ['observability'],
            name: i18n.translate('xpack.streams.sigEventsIndexPatternsSettingsName', {
              defaultMessage: 'Significant Events index patterns',
            }) as string,
            value: DEFAULT_INDEX_PATTERNS,
            description: i18n.translate('xpack.streams.sigEventsIndexPatternsSettingsDescription', {
              defaultMessage:
                'Comma-separated list of index patterns used for Significant Events stream filtering and analysis.',
            }),
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
            name: i18n.translate('xpack.streams.significantEventsDiscoverySettingsName', {
              defaultMessage: 'Streams significant events discovery',
            }) as string,
            value: false,
            description: i18n.translate(
              'xpack.streams.significantEventsDiscoverySettingsDescription',
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

        core.uiSettings.registerGlobal({
          [OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED]: {
            category: ['observability'],
            name: i18n.translate('xpack.streams.continuousKiExtractionEnabledName', {
              defaultMessage: 'Continuous KI extraction enabled',
            }),
            value: false,
            description: i18n.translate('xpack.streams.continuousKiExtractionEnabledDescription', {
              defaultMessage:
                'When enabled, knowledge indicator extraction runs automatically on managed streams.',
            }),
            type: 'boolean',
            schema: schema.boolean(),
            scope: 'global',
            solutionViews: ['classic', 'oblt'],
            readonly: true,
            readonlyMode: 'ui',
          },
          [OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS]: {
            category: ['observability'],
            name: i18n.translate('xpack.streams.continuousKiExtractionIntervalHoursName', {
              defaultMessage: 'Continuous KI extraction interval (hours)',
            }),
            value: DEFAULT_EXTRACTION_INTERVAL_HOURS,
            description: i18n.translate(
              'xpack.streams.continuousKiExtractionIntervalHoursDescription',
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
            name: i18n.translate('xpack.streams.continuousKiExtractionExcludedStreamPatternsName', {
              defaultMessage: 'Continuous KI extraction excluded streams',
            }),
            value: '',
            description: i18n.translate(
              'xpack.streams.continuousKiExtractionExcludedStreamPatternsDescription',
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
        });
      }
    })
    .catch((error) => {
      logger.error(`Failed to register significant events ui settings: ${error}`);
    });

  core.uiSettings.register({
    [OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS]: {
      category: ['observability'],
      name: i18n.translate('xpack.streams.streamsContentPacksSettingsName', {
        defaultMessage: 'Streams content packs',
      }) as string,
      value: false,
      description: i18n.translate('xpack.streams.streamsContentPacksSettingsDescription', {
        defaultMessage: 'Enable Streams content packs.',
      }),
      type: 'boolean',
      schema: schema.boolean(),
      requiresPageReload: true,
      solutionViews: ['classic', 'oblt'],
      technicalPreview: true,
    },
    [OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS]: {
      category: ['observability'],
      name: i18n.translate('xpack.streams.streamsAttachmentsSettingsName', {
        defaultMessage: 'Streams attachments',
      }),
      value: false,
      description: i18n.translate('xpack.streams.streamsAttachmentsSettingsDescription', {
        defaultMessage: 'Enable Streams attachments tab.',
      }),
      type: 'boolean',
      schema: schema.boolean(),
      requiresPageReload: true,
      solutionViews: ['classic', 'oblt'],
      technicalPreview: true,
    },
    [OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS]: {
      category: ['observability'],
      name: i18n.translate('xpack.streams.queryStreamsSettingsName', {
        defaultMessage: 'Query streams',
      }) as string,
      value: false,
      description: i18n.translate('xpack.streams.queryStreamsSettingsDescription', {
        defaultMessage: 'Enable Query streams.',
      }),
      type: 'boolean',
      schema: schema.boolean(),
      requiresPageReload: true,
      solutionViews: ['classic', 'oblt'],
      technicalPreview: true,
      readonly: true,
      readonlyMode: 'ui',
    },
    [OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS]: {
      category: ['observability'],
      name: i18n.translate('xpack.streams.wiredStreamViewsSettingsName', {
        defaultMessage: 'Wired stream views',
      }),
      value: false,
      description: i18n.translate('xpack.streams.wiredStreamViewsSettingsDescription', {
        defaultMessage: 'Enable ES|QL views for wired streams.',
      }),
      type: 'boolean',
      schema: schema.boolean(),
      requiresPageReload: true,
      solutionViews: ['classic', 'oblt'],
      technicalPreview: true,
      readonly: true,
      readonlyMode: 'ui',
    },
    [OBSERVABILITY_STREAMS_ENABLE_OVERVIEW_PAGE]: {
      category: ['observability'],
      name: i18n.translate('xpack.streams.streamsOverviewPageSettingsName', {
        defaultMessage: 'Streams overview page',
      }),
      value: false,
      description: i18n.translate('xpack.streams.streamsOverviewPageSettingsDescription', {
        defaultMessage:
          'Enable the stream Overview tab. When disabled, the default management tab is Retention (ingest streams) or Schema (query streams).',
      }),
      type: 'boolean',
      schema: schema.boolean(),
      requiresPageReload: true,
      solutionViews: ['classic', 'oblt'],
      technicalPreview: true,
      readonly: true,
      readonlyMode: 'ui',
    },
  });
}
