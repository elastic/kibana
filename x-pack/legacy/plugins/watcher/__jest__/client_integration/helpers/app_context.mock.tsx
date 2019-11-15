/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ComponentType } from 'enzyme';

import { AppContextProvider } from '../../../public/np_ready/application/app_context';

export const withAppContext = (Component: ComponentType<any>) => (props: any) => {
  return (
    <AppContextProvider
      value={{
        docLinks: {
          DOC_LINK_VERSION: 'test',
          ELASTIC_WEBSITE_URL: 'test',
          links: {} as any,
        },
        savedObjects: {
          create: jest.fn(),
        } as any,
        uiSettings: {} as any,
        chrome: {
          setBreadCrumbs: () => {},
        },
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
        uiSettings: {
          get: () => {},
          isDefault: () => true,
        },
        MANAGEMENT_BREADCRUMB: { text: 'test' },
      }}
    >
      <Component {...props} />
    </AppContextProvider>
  );
};
