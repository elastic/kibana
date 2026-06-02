/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTING_V2_ENABLED_SETTING_ID = 'alerting:v2:enabled';

/**
 * Canonical contract for alerting v2 advanced settings: maps each setting
 * ID to the runtime value type it carries. This is the single source of
 * truth that:
 *   - typed consumers (e.g. SettingsService) read to type their `get`/`set`,
 *   - the server-side runtime registration is constrained against (so the
 *     registered config-schema and default value cannot drift from the
 *     declared type).
 *
 * Add a new setting by extending this map; downstream get/set calls and the
 * runtime registration will be type-checked against the new entry.
 */
export interface AlertingV2AdvancedSettingValueMap {
  [ALERTING_V2_ENABLED_SETTING_ID]: boolean;
}

export type AlertingV2AdvancedSettingId = keyof AlertingV2AdvancedSettingValueMap;

export type AlertingV2AdvancedSettingValue<K extends AlertingV2AdvancedSettingId> =
  AlertingV2AdvancedSettingValueMap[K];
