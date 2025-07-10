/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CoreSetup, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  OBSERVABILITY_ENABLE_STREAMS_UI,
  OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS,
} from '@kbn/management-settings-ids';
import { StreamsPluginSetupDependencies, StreamsPluginStartDependencies } from './types';
import { STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE } from '../common';

export function registerFeatureFlags(
  core: CoreSetup<StreamsPluginStartDependencies>,
  plugins: StreamsPluginSetupDependencies,
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
            solution: 'oblt',
            technicalPreview: true,
          },
        });
      }
    })
    .catch((error) => {
      logger.error(`Failed to register significant events ui settings: ${error}`);
    });

  const isObservabilityServerless =
    plugins.cloud?.isServerlessEnabled && plugins.cloud?.serverless.projectType === 'observability';

  core.uiSettings.register({
    [OBSERVABILITY_ENABLE_STREAMS_UI]: {
      category: ['observability'],
      name: 'Streams UI',
      value: isObservabilityServerless,
      description: i18n.translate('xpack.streams.enableStreamsUIDescription', {
        defaultMessage: 'Enable the {streamsLink}.',
        values: {
          streamsLink: `<a href="https://www.elastic.co/docs/solutions/observability/logs/streams/streams">Streams UI</href>`,
        },
      }),
      type: 'boolean',
      schema: schema.boolean(),
      requiresPageReload: true,
      solution: 'oblt',
      technicalPreview: true,
    },
  });
}
