/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

const staticContext = {
  data: dataPluginMock.createStartContract(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
};

jest.spyOn(staticContext.uiSettings, 'get').mockImplementation((key: string) => {
  if (key === 'dateFormat') {
    return 'MMM D, YYYY @ HH:mm:ss.SSS';
  }
  if (key === 'dateFormat:scaled') {
    return [
      ['', 'HH:mm:ss.SSS'],
      ['PT1S', 'HH:mm:ss'],
      ['PT1M', 'HH:mm'],
      ['PT1H', 'YYYY-MM-DD HH:mm'],
      ['P1DT', 'YYYY-MM-DD'],
      ['P1YT', 'YYYY'],
    ];
  }
  if (key === 'histogram:maxBars') {
    return 1000;
  }
  if (key === 'histogram:barTarget') {
    return 50;
  }
  return '';
});

export const useAiopsAppContext = jest.fn(() => {
  return staticContext;
});
