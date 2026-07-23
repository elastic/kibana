/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS,
  OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS,
  OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS,
  OBSERVABILITY_STREAMS_ENABLE_DRAFT_STREAMS,
  OBSERVABILITY_STREAMS_ENABLE_CANVAS,
} from '@kbn/management-settings-ids';

import type { StreamsPluginStartDependencies } from './types';

export function registerFeatureFlags(core: CoreSetup<StreamsPluginStartDependencies>) {
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
    [OBSERVABILITY_STREAMS_ENABLE_DRAFT_STREAMS]: {
      category: ['observability'],
      name: i18n.translate('xpack.streams.draftStreamsSettingsName', {
        defaultMessage: 'Draft streams',
      }),
      value: false,
      description: i18n.translate('xpack.streams.draftStreamsSettingsDescription', {
        defaultMessage:
          'Enable draft streams. Draft streams use ES|QL views for read-time processing and can be materialized to ingest pipelines.',
      }),
      type: 'boolean',
      schema: schema.boolean(),
      requiresPageReload: true,
      solutionViews: ['classic', 'oblt'],
      technicalPreview: true,
      readonly: true,
      readonlyMode: 'ui',
    },
    [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: {
      category: ['observability'],
      name: i18n.translate('xpack.streams.canvasSettingsName', {
        defaultMessage: 'Streams Canvas',
      }),
      value: false,
      description: i18n.translate('xpack.streams.canvasSettingsDescription', {
        defaultMessage: 'Enable the Streams Canvas experience.',
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
