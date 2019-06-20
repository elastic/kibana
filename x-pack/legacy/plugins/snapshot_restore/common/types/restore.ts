/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface RestoreSettings {
  indices?: string[];
  renamePattern?: string;
  renameReplacement?: string;
  includeGlobalState?: boolean;
  partial?: boolean;
  indexSettings?: string;
  ignoreIndexSettings?: string[];
}

export interface RestoreSettingsEs {
  indices?: string[];
  rename_pattern?: string;
  rename_replacement?: string;
  include_global_state?: boolean;
  partial?: boolean;
  index_settings?: { [key: string]: any };
  ignore_index_settings?: string[];
}
