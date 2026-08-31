/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTING_V2_ENABLED_SETTING_ID = 'alerting:v2:enabled';

/**
 * Space-scoped. When Alerting v2 is enabled, controls whether the classic
 * Observability alerts table remains in solution navigation.
 */
export const ALERTING_V2_SHOW_CLASSIC_ALERTS_TABLE_SETTING_ID =
  'alerting:v2:showClassicAlertsTable';

export interface AlertingAdvancedSettingValueMap {
  [ALERTING_V2_ENABLED_SETTING_ID]: boolean;
}

export type AlertingAdvancedSettingId = keyof AlertingAdvancedSettingValueMap;

export type AlertingAdvancedSettingValue<K extends AlertingAdvancedSettingId> =
  AlertingAdvancedSettingValueMap[K];
