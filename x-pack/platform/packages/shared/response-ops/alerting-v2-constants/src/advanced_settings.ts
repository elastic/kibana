/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Space-scoped. Controls whether the V1 Observability alerts table remains in
 * solution navigation.
 */
export const ALERTING_V2_SHOW_V1_OBSERVABILITY_ALERTS_TABLE_SETTING_ID =
  'alerting:v1:showV1ObservabilityAlertsTable';

export const ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID = 'alerting:v2:experimentalFeatures';

export interface AlertingAdvancedSettingValueMap {
  [ALERTING_V2_SHOW_V1_OBSERVABILITY_ALERTS_TABLE_SETTING_ID]: boolean;
  [ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]: boolean;
}

export type AlertingAdvancedSettingId = keyof AlertingAdvancedSettingValueMap;

export type AlertingAdvancedSettingValue<K extends AlertingAdvancedSettingId> =
  AlertingAdvancedSettingValueMap[K];
