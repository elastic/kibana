/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import {
  MAX_OPEN_CASES_DEFAULT_MAXIMUM,
  MAX_OPEN_CASES_ADVANCED_SETTING,
} from '../common/constants';
import { initUiSettings } from './ui_settings';

describe('initUiSettings', () => {
  it('registers the max open cases override setting', () => {
    const uiSettings = coreMock.createSetup().uiSettings;

    initUiSettings(uiSettings);

    const registeredSettings = (uiSettings.register as jest.Mock).mock.calls[0][0];

    expect(registeredSettings).toHaveProperty(MAX_OPEN_CASES_ADVANCED_SETTING);
    expect(registeredSettings[MAX_OPEN_CASES_ADVANCED_SETTING]).toEqual(
      expect.objectContaining({
        name: 'Maximum cases created per rule run',
        value: MAX_OPEN_CASES_DEFAULT_MAXIMUM,
        type: 'number',
      })
    );
  });
});
