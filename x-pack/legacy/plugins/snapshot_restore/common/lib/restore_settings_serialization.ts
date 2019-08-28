/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RestoreSettings, RestoreSettingsEs } from '../types';

const removeUndefinedSettings = (settings: RestoreSettingsEs): RestoreSettingsEs => {
  return Object.entries(settings).reduce((sts: RestoreSettingsEs, [key, value]) => {
    if (value !== undefined) {
      sts[key as keyof RestoreSettingsEs] = value;
    }
    return sts;
  }, {});
};

export function serializeRestoreSettings(restoreSettings: RestoreSettings): RestoreSettingsEs {
  const {
    indices,
    renamePattern,
    renameReplacement,
    includeGlobalState,
    partial,
    indexSettings,
    ignoreIndexSettings,
    ignoreUnavailable,
  } = restoreSettings;

  let parsedIndexSettings: RestoreSettingsEs['index_settings'] | undefined;
  if (indexSettings) {
    try {
      parsedIndexSettings = JSON.parse(indexSettings);
    } catch (e) {
      // Silently swallow parsing errors since parsing validation is done on client
      // so we should never reach this point
    }
  }

  const settings: RestoreSettingsEs = {
    indices,
    rename_pattern: renamePattern,
    rename_replacement: renameReplacement,
    include_global_state: includeGlobalState,
    partial,
    index_settings: parsedIndexSettings,
    ignore_index_settings: ignoreIndexSettings,
    ignore_unavailable: ignoreUnavailable,
  };

  return removeUndefinedSettings(settings);
}

export function deserializeRestoreSettings(restoreSettingsEs: RestoreSettingsEs): RestoreSettings {
  const {
    indices,
    rename_pattern: renamePattern,
    rename_replacement: renameReplacement,
    include_global_state: includeGlobalState,
    partial,
    index_settings: indexSettings,
    ignore_index_settings: ignoreIndexSettings,
    ignore_unavailable: ignoreUnavailable,
  } = restoreSettingsEs;

  const settings: RestoreSettings = {
    indices,
    renamePattern,
    renameReplacement,
    includeGlobalState,
    partial,
    indexSettings: indexSettings ? JSON.stringify(indexSettings) : undefined,
    ignoreIndexSettings,
    ignoreUnavailable,
  };

  return removeUndefinedSettings(settings);
}
