/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTING_V2_ENABLED_SETTING_ID = 'alerting:v2:enabled';

/**
 * Union of advanced setting IDs owned by the alerting v2 plugin. New
 * alerting v2 advanced settings must be added here so the SettingsService
 * (and any other typed consumers) know about them.
 */
export type AlertingV2AdvancedSettingId = typeof ALERTING_V2_ENABLED_SETTING_ID;
