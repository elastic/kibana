/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsParams } from '@kbn/core/types';
import { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '../../common/experimental_features';

export const experimentalFeaturesUiSettings: Record<string, UiSettingsParams> = {
  [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.alertingVTwo.experimentalFeaturesSettingName', {
      defaultMessage: 'Alerting v2: Experimental features',
    }),
    type: 'boolean',
    value: false,
    description: i18n.translate('xpack.alertingVTwo.experimentalFeaturesSettingDescription', {
      defaultMessage:
        'Enables experimental alerting v2 features such as Agent Builder rule management.',
    }),
    schema: schema.boolean(),
    requiresPageReload: false,
    technicalPreview: true,
  },
};
