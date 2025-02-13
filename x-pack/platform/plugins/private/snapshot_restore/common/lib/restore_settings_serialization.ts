/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    featureStates,
    partial,
    indexSettings,
    ignoreIndexSettings,
    ignoreUnavailable,
    includeAliases,
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
    feature_states: featureStates,
    partial,
    index_settings: parsedIndexSettings,
    ignore_index_settings: ignoreIndexSettings,
    ignore_unavailable: ignoreUnavailable,
    include_aliases: includeAliases,
  };

  return removeUndefinedSettings(settings);
}
