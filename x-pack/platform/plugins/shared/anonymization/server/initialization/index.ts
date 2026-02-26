/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ensureAlertsDataViewProfile,
  getAlertsDataViewTargetId,
  ALERTS_DATA_VIEW_TARGET_TYPE,
} from './alerts_profile_initializer';
export { getDefaultAlertFieldRules } from './default_field_rules';
export {
  ensureGlobalAnonymizationProfile,
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE,
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
  GLOBAL_ANONYMIZATION_PROFILE_NAME,
  isGlobalProfileTarget,
} from './global_profile_initializer';
export {
  LEGACY_ANONYMIZATION_UI_SETTING_KEY,
  extractEnabledLegacyRules,
  migrateLegacyUiSettingsIntoGlobalProfile,
} from './legacy_ui_settings_migration';
export { ensureGlobalProfileForNamespace } from './ensure_global_profile';
