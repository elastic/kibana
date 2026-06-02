/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsParams } from '@kbn/core/types';
import { ALERTING_V2_ENABLED_SETTING_ID } from '../../common/advanced_settings';

const ALERTING_V2_CATEGORY = 'alertingV2';

export const alertingAdvancedSettings: Record<string, UiSettingsParams> = {
  [ALERTING_V2_ENABLED_SETTING_ID]: {
    category: [ALERTING_V2_CATEGORY],
    name: i18n.translate('xpack.alertingVTwo.enabledSettingName', {
      defaultMessage: 'Alerting v2',
    }),
    type: 'boolean',
    value: false,
    description: i18n.translate('xpack.alertingVTwo.enabledSettingDescription', {
      defaultMessage: 'Enables the alerting v2 engine, APIs, and UI.',
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
    technicalPreview: true,
  },
};
