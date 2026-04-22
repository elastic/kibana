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
  ALERTING_V2_RULE_DOCTOR_CONTINUOUS_SETTING_ID,
  ALERTING_V2_RULE_DOCTOR_COVERAGE_CADENCE_SETTING_ID,
} from '../../common/experimental_features';

export const DEFAULT_RULE_DOCTOR_INTERVAL_HOURS = 24;
export const DEFAULT_RULE_DOCTOR_COVERAGE_CADENCE_MINUTES = 15;

export const experimentalFeaturesUiSettings: Record<string, UiSettingsParams> = {
  [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.alertingVTwo.experimentalFeaturesSettingName', {
      defaultMessage: 'Alerting v2: Experimental features',
    }),
    scope: 'global',
    value: false,
    description: i18n.translate('xpack.alertingVTwo.experimentalFeaturesSettingDescription', {
      defaultMessage: 'Enables experimental alerting v2 features such as Rule Doctor.',
    }),
    schema: schema.boolean(),
    requiresPageReload: false,
    technicalPreview: true,
  },
  [ALERTING_V2_RULE_DOCTOR_INTERVAL_SETTING_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.alertingVTwo.ruleDoctorIntervalSettingName', {
      defaultMessage: 'Alerting v2: Rule Doctor analysis interval (hours)',
    }),
    scope: 'global',
    value: DEFAULT_RULE_DOCTOR_INTERVAL_HOURS,
    description: i18n.translate('xpack.alertingVTwo.ruleDoctorIntervalSettingDescription', {
      defaultMessage:
        'How often Rule Doctor re-analyzes rules, in hours. ' +
        'Requires "Alerting v2: Experimental features" to be enabled.',
    }),
    schema: schema.number({ min: 1, max: 168 }),
    requiresPageReload: false,
    technicalPreview: true,
  },
  [ALERTING_V2_RULE_DOCTOR_CONTINUOUS_SETTING_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.alertingVTwo.ruleDoctorContinuousSettingName', {
      defaultMessage: 'Alerting v2: Rule Doctor continuous suggestions',
    }),
    scope: 'global',
    value: false,
    description: i18n.translate('xpack.alertingVTwo.ruleDoctorContinuousSettingDescription', {
      defaultMessage:
        'When enabled, Rule Doctor automatically runs analysis on a schedule and surfaces new suggestions. ' +
        'Requires "Alerting v2: Experimental features" to be enabled.',
    }),
    schema: schema.boolean(),
    requiresPageReload: false,
    technicalPreview: true,
  },
  [ALERTING_V2_RULE_DOCTOR_COVERAGE_CADENCE_SETTING_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.alertingVTwo.ruleDoctorCoverageCadenceSettingName', {
      defaultMessage: 'Alerting v2: Rule Doctor coverage analysis cadence (minutes)',
    }),
    scope: 'global',
    value: DEFAULT_RULE_DOCTOR_COVERAGE_CADENCE_MINUTES,
    description: i18n.translate(
      'xpack.alertingVTwo.ruleDoctorCoverageCadenceSettingDescription',
      {
        defaultMessage:
          'How often the Rule Doctor coverage task checks for data views needing analysis, in minutes. ' +
          'Requires "Alerting v2: Experimental features" to be enabled.',
      }
    ),
    schema: schema.number({ min: 1, max: 1440 }),
    requiresPageReload: false,
    technicalPreview: true,
  },
};
