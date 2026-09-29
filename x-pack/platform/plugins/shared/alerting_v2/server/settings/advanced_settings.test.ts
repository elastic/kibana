/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/alerting-v2-constants';
import {
  alertingSpaceAdvancedSettings,
  registerAlertingAdvancedSettings,
} from './advanced_settings';

describe('registerAlertingAdvancedSettings', () => {
  it('registers space settings in the namespace scope', () => {
    const uiSettings = uiSettingsServiceMock.createSetupContract();

    registerAlertingAdvancedSettings(uiSettings);

    expect(uiSettings.register).toHaveBeenCalledWith(alertingSpaceAdvancedSettings);
    expect(uiSettings.registerGlobal).not.toHaveBeenCalled();
  });

  it('registers experimental features in the Alerting category with a false default', () => {
    expect(alertingSpaceAdvancedSettings[ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID]).toEqual(
      expect.objectContaining({
        category: ['alerting'],
        value: false,
      })
    );
  });
});
