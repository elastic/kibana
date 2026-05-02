/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { EXPERIMENTAL_FEATURES_SETTING_ID } from '../../common/constants';

export interface SettingsApiService {
  setExperimentalFeaturesEnabled: (enabled: boolean) => Promise<void>;
}

export const getSettingsApiService = ({
  log,
  kbnClient,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
}): SettingsApiService => ({
  setExperimentalFeaturesEnabled: (enabled) =>
    measurePerformanceAsync(log, 'settings.setExperimentalFeaturesEnabled', async () => {
      await kbnClient.uiSettings.update({
        [EXPERIMENTAL_FEATURES_SETTING_ID]: enabled,
      });
    }),
});
