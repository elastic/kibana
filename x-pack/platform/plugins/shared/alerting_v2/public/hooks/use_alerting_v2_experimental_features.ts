/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, useService } from '@kbn/core-di-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/alerting-v2-constants';

/**
 * Whether a uiSettings client has Alerting V2 experimental features enabled.
 *
 * This keeps consumers rendered outside the Alerting V2 DI context able to use
 * the same space-scoped setting as the hook below.
 */
export const isAlertingV2ExperimentalFeaturesEnabled = (uiSettings: IUiSettingsClient): boolean =>
  uiSettings.get<boolean>(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID) === true;

/** Whether the current space has opted into Alerting V2 experimental features. */
export const useAlertingV2ExperimentalFeatures = (): boolean => {
  const uiSettings = useService(CoreStart('uiSettings'));

  return isAlertingV2ExperimentalFeaturesEnabled(uiSettings);
};
