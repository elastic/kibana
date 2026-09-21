/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsParams } from '@kbn/core/types';
import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import {
  ALERTING_V2_ENABLED_SETTING_ID,
  ALERTING_V2_SHOW_CLASSIC_ALERTS_PAGE_SETTING_ID,
  ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID,
  type AlertingAdvancedSettingId,
  type AlertingAdvancedSettingValueMap,
} from '@kbn/alerting-v2-constants';

// Mirrors the category identifiers in `kbn-management/settings/utilities/category/const.ts`,
// a `shared-browser` package not consumable from plugin server code.
const ALERTING_V2_CATEGORY = 'alertingV2';
const ALERTING_CATEGORY = 'alerting';

type AlertingV2AdvancedSettingsRegistration<K extends AlertingAdvancedSettingId> = {
  [P in K]: UiSettingsParams<AlertingAdvancedSettingValueMap[P]>;
};

// Global — gates the alerting v2 APIs and UI.
export const alertingGlobalAdvancedSettings = {
  [ALERTING_V2_ENABLED_SETTING_ID]: {
    category: [ALERTING_V2_CATEGORY],
    name: i18n.translate('xpack.alertingVTwo.enabledSettingName', {
      defaultMessage: 'Alerting V2',
    }),
    type: 'boolean',
    value: false,
    description: i18n.translate('xpack.alertingVTwo.enabledSettingDescription', {
      defaultMessage: 'Enables the alerting V2 APIs and UI.',
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
    experimental: true,
  },
} satisfies AlertingV2AdvancedSettingsRegistration<typeof ALERTING_V2_ENABLED_SETTING_ID>;

export const alertingSpaceAdvancedSettings = {
  [ALERTING_V2_SHOW_CLASSIC_ALERTS_PAGE_SETTING_ID]: {
    category: [ALERTING_CATEGORY],
    name: i18n.translate('xpack.alertingVTwo.showClassicAlertsTableSettingName', {
      defaultMessage: 'Show classic alerts table',
    }),
    type: 'boolean',
    value: false,
    description: i18n.translate('xpack.alertingVTwo.showClassicAlertsTableSettingDescription', {
      defaultMessage:
        'Show the classic Observability alerts table in navigation. Only displays alerts from v1 alerting rules.',
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
    experimental: true,
  },
  [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: {
    category: [ALERTING_CATEGORY],
    name: i18n.translate('xpack.alertingV2.experimentalFeaturesSettingName', {
      defaultMessage: 'Alerting V2: Experimental Features',
    }),
    type: 'boolean',
    value: false,
    description: i18n.translate('xpack.alertingV2.experimentalFeaturesSettingDescription', {
      defaultMessage: 'Enables experimental features for Alerting V2.',
  },
} satisfies AlertingV2AdvancedSettingsRegistration<
  | typeof ALERTING_V2_SHOW_CLASSIC_ALERTS_PAGE_SETTING_ID
  | typeof ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID
>;

export const registerAlertingAdvancedSettings = (uiSettings: UiSettingsServiceSetup): void => {
  uiSettings.registerGlobal(alertingGlobalAdvancedSettings);
  uiSettings.register(alertingSpaceAdvancedSettings);
};
