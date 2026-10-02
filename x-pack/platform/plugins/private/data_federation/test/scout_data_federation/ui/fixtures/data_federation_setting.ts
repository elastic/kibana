/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

const DATA_FEDERATION_ENABLED_SETTING_ID = 'dataFederation:enabled';

/** Turns on the global advanced setting that shows the Data Federation management app. */
export const enableDataFederationSetting = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.uiSettings.updateGlobal({ [DATA_FEDERATION_ENABLED_SETTING_ID]: true });
};

/** Removes the user value so the setting falls back to its default. No-op when not set. */
export const unsetDataFederationSetting = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.request({
    description: `unset ${DATA_FEDERATION_ENABLED_SETTING_ID}`,
    path: `/internal/kibana/global_settings/${encodeURIComponent(
      DATA_FEDERATION_ENABLED_SETTING_ID
    )}`,
    method: 'DELETE',
  });
};
