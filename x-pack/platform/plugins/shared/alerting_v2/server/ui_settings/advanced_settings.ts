/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsParams } from '@kbn/core/types';
import {
  ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID,
  ALERTING_V2_RULE_DOCTOR_INTERVAL_SETTING_ID,
  ALERTING_V2_DISPATCHER_ENABLED_SETTING_ID,
} from '../../common/advanced_settings';

export const alertingV2UiSettings: Record<string, UiSettingsParams> = {
  [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.alertingVTwo.experimentalFeaturesSettingName', {
      defaultMessage: 'Alerting v2: Experimental features',
    }),
    type: 'boolean',
    value: false,
    description: i18n.translate('xpack.alertingVTwo.experimentalFeaturesSettingDescription', {
      defaultMessage: 'Enables experimental alerting v2 features such as Rule Doctor.',
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
    technicalPreview: true,
  },
  [ALERTING_V2_RULE_DOCTOR_INTERVAL_SETTING_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.alertingVTwo.ruleDoctorIntervalSettingName', {
      defaultMessage: 'Alerting v2: Rule Doctor continuous analysis interval (hours)',
    }),
    type: 'number',
    value: null,
    description: i18n.translate('xpack.alertingVTwo.ruleDoctorIntervalSettingDescription', {
      defaultMessage:
        'Interval for continuous Rule Doctor analysis, in hours. ' +
        'Leave unset to disable. Requires "Alerting v2: Experimental features" to be enabled.',
    }),
    schema: schema.nullable(schema.number({ min: 1, max: 168 })),
    requiresPageReload: false,
    technicalPreview: true,
  },
  [ALERTING_V2_DISPATCHER_ENABLED_SETTING_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.alertingVTwo.dispatcherEnabledSettingName', {
      defaultMessage: 'Alerting v2 dispatcher',
    }),
    scope: 'global',
    value: true,
    description: i18n.translate('xpack.alertingVTwo.dispatcherEnabledSettingDescription', {
      defaultMessage:
        'Controls whether the alerting v2 dispatcher task processes alert episodes. When disabled, the task still runs on schedule but performs no work.',
    }),
    schema: schema.boolean(),
    requiresPageReload: false,
  },
};
