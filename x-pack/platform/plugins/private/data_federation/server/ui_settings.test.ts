/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { DATA_FEDERATION_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { registerUiSettings } from './ui_settings';

const getRegisteredSetting = (isServerless: boolean) => {
  const { uiSettings } = coreMock.createSetup();

  registerUiSettings({ uiSettings, isServerless });

  expect(uiSettings.register).not.toHaveBeenCalled();
  return (uiSettings.registerGlobal as jest.Mock).mock.calls[0][0][
    DATA_FEDERATION_ENABLED_SETTING_ID
  ];
};

describe('registerUiSettings', () => {
  it('registers the data federation UI setting as global, disabled by default', () => {
    expect(getRegisteredSetting(false)).toEqual(
      expect.objectContaining({
        category: ['dataFederation'],
        value: false,
        schema: expect.any(Object),
        requiresPageReload: true,
        technicalPreview: true,
      })
    );
  });

  it('mentions the Enterprise license requirement in stateful', () => {
    expect(getRegisteredSetting(false).description).toContain(
      'Requires <b>enterprise</b> license.'
    );
  });

  it('does not mention a license requirement in serverless', () => {
    expect(getRegisteredSetting(true).description).not.toContain('license');
  });

  it.each([false, true])('links to the documentation (serverless: %s)', (isServerless) => {
    expect(getRegisteredSetting(isServerless).description).toContain(
      'href="https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation"'
    );
  });
});
