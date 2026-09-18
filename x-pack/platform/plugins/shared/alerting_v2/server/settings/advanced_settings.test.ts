/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import {
  ALERTING_V2_ENABLED_SETTING_ID,
  ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID,
} from '@kbn/alerting-v2-constants';
import {
  alertingGlobalAdvancedSettings,
  alertingSpaceAdvancedSettings,
  registerAlertingAdvancedSettings,
} from './advanced_settings';

describe('registerAlertingAdvancedSettings', () => {
  it('registers global and space settings in their respective scopes', () => {
    const uiSettings = uiSettingsServiceMock.createSetupContract();

    registerAlertingAdvancedSettings(uiSettings);

    expect(uiSettings.registerGlobal).toHaveBeenCalledWith(alertingGlobalAdvancedSettings);
    expect(uiSettings.register).toHaveBeenCalledWith(alertingSpaceAdvancedSettings);
  });

  it('registers experimental features in the Alerting category with a false default', () => {
    expect(alertingSpaceAdvancedSettings[ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]).toEqual(
      expect.objectContaining({
        category: ['alerting'],
        value: false,
      })
    );
  });

  it('registers the global setting in the Alerting V2 category', () => {
    expect(alertingGlobalAdvancedSettings[ALERTING_V2_ENABLED_SETTING_ID]).toEqual(
      expect.objectContaining({ category: ['alertingV2'] })
    );
  });
});
