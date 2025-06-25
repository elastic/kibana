/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';

const technicalPreviewLabel = i18n.translate('xpack.streams.technicalPreviewSettingLabel', {
  defaultMessage: 'Technical Preview',
});

export const featureFlagUiSettings: Record<string, UiSettingsParams> = {
  [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: {
    category: ['observability'],
    name: i18n.translate('xpack.streams.significantEventsSettingsName', {
      defaultMessage: 'Streams significant events',
    }),
    value: false,
    description: i18n.translate('xpack.streams.significantEventsSettingsDescription', {
      defaultMessage: '{technicalPreviewLabel} Enable streams significant events.',

      values: { technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>` },
    }),
    type: 'boolean',
    schema: schema.boolean(),
    requiresPageReload: true,
    solution: 'oblt',
  },
};
