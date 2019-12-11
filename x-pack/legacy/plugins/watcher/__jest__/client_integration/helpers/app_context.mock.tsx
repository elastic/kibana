/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ComponentType } from 'enzyme';
import {
  chromeServiceMock,
  docLinksServiceMock,
  uiSettingsServiceMock,
  notificationServiceMock,
  httpServiceMock,
} from '../../../../../../../src/core/public/mocks';
import { AppContextProvider } from '../../../public/np_ready/application/app_context';

export const mockContextValue = {
  docLinks: docLinksServiceMock.createStartContract(),
  chrome: chromeServiceMock.createStartContract(),
  legacy: {
    TimeBuckets: class MockTimeBuckets {
      setBounds(_domain: any) {
        return {};
      }
      getInterval() {
        return {
          expression: {},
        };
      }
    },
    MANAGEMENT_BREADCRUMB: { text: 'test' },
    licenseStatus: {},
  },
  uiSettings: uiSettingsServiceMock.createSetupContract(),
  toasts: notificationServiceMock.createSetupContract().toasts,
  euiUtils: {
    useChartsTheme: jest.fn(),
  },
  // For our test harness, we don't use this mocked out http service
  http: httpServiceMock.createSetupContract(),
};

export const withAppContext = (Component: ComponentType<any>) => (props: any) => {
  return (
    <AppContextProvider value={mockContextValue}>
      <Component {...props} />
    </AppContextProvider>
  );
};
