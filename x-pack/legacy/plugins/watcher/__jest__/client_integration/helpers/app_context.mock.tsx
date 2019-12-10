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
} from '../../../../../../../src/core/public/mocks';
import { AppContextProvider } from '../../../public/np_ready/application/app_context';

export const withAppContext = (Component: ComponentType<any>) => (props: any) => {
  return (
    <AppContextProvider
      value={
        {
          docLinks: docLinksServiceMock.createStartContract(),
          chrome: chromeServiceMock.createStartContract(),
          legacy: {
            TimeBuckets: class MockTimeBuckes {
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
            savedObjects: {
              create: jest.fn(),
            } as any,
          },
          uiSettings: uiSettingsServiceMock.createSetupContract(),
          toasts: notificationServiceMock.createSetupContract().toasts,
        } as any
      }
    >
      <Component {...props} />
    </AppContextProvider>
  );
};
