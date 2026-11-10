/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

const DATA_FEDERATION_ENABLED_SETTING_ID = 'dataFederation:enabled';
const GLOBAL_SETTINGS_PATH = '/internal/kibana/global_settings';

interface GlobalSettingsResponse {
  settings: Record<string, { userValue?: boolean } | undefined>;
}

/** Returns the configured value of the setting, or `undefined` when it uses the default. */
export const getDataFederationSetting = async (
  kbnClient: KbnClient
): Promise<boolean | undefined> => {
  const { data } = await kbnClient.request<GlobalSettingsResponse>({
    description: `get ${DATA_FEDERATION_ENABLED_SETTING_ID}`,
    path: GLOBAL_SETTINGS_PATH,
    method: 'GET',
  });
  return data.settings[DATA_FEDERATION_ENABLED_SETTING_ID]?.userValue;
};

export const setDataFederationSetting = async (
  kbnClient: KbnClient,
  enabled: boolean
): Promise<void> => {
  await kbnClient.uiSettings.updateGlobal({ [DATA_FEDERATION_ENABLED_SETTING_ID]: enabled });
};

/** Removes the configured value so the setting falls back to its default. No-op when not set. */
export const unsetDataFederationSetting = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.request({
    description: `unset ${DATA_FEDERATION_ENABLED_SETTING_ID}`,
    path: `${GLOBAL_SETTINGS_PATH}/${encodeURIComponent(DATA_FEDERATION_ENABLED_SETTING_ID)}`,
    method: 'DELETE',
  });
};
