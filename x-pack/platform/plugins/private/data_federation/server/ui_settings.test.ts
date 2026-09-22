/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { DATA_FEDERATION_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { registerUiSettings } from './ui_settings';

describe('registerUiSettings', () => {
  it('registers the data federation UI setting, disabled by default', () => {
    const { uiSettings } = coreMock.createSetup();

    registerUiSettings({ uiSettings });

    const registeredSettings = (uiSettings.register as jest.Mock).mock.calls[0][0];

    expect(registeredSettings).toHaveProperty(DATA_FEDERATION_ENABLED_SETTING_ID);
    expect(registeredSettings[DATA_FEDERATION_ENABLED_SETTING_ID]).toEqual(
      expect.objectContaining({
        value: false,
        schema: expect.any(Object),
        requiresPageReload: true,
        technicalPreview: true,
      })
    );
  });
});
