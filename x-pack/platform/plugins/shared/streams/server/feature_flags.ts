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
  OBSERVABILITY_STREAMS_ENABLE_GROUP_STREAMS,
  OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS,
  OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS,
} from '@kbn/management-settings-ids';
import type { StreamsPluginStartDependencies } from './types';
import { STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE } from '../common';

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
      }
    })
    .catch((error) => {
      logger.error(`Failed to register significant events ui settings: ${error}`);
    });

  core.uiSettings.register({
    [OBSERVABILITY_STREAMS_ENABLE_GROUP_STREAMS]: {
      category: ['observability'],
      name: i18n.translate('xpack.streams.groupStreamsSettingsName', {
        defaultMessage: 'Group streams',
      }) as string,
      value: false,
      description: i18n.translate('xpack.streams.groupStreamsSettingsDescription', {
        defaultMessage: 'Enable Group streams.',
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
      readonly: true,
      readonlyMode: 'ui',
    },
  });
}
