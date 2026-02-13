/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18nProvider } from '@kbn/test-jest-helpers';
import { NoData } from '.';

jest.mock('../../legacy_shims', () => ({
  Legacy: {
    shims: {
      hasEnterpriseLicense: false,
      useCloudConnectStatus: () => ({ isCloudConnectAutoopsEnabled: false, isLoading: false }),
    },
  },
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      docLinks: {
        links: {
          cloud: {
            connectToAutoops: 'https://docs.elastic.co/cloud/connect',
          },
        },
      },
      application: {
        getUrlForApp: jest.fn(() => '/app/cloud_connect'),
        navigateToApp: jest.fn(),
        capabilities: {
          cloudConnect: {
            show: true,
            configure: true,
          },
        },
      },
    },
  }),
}));

const enabler = {};

describe('NoData', () => {
  test('should show text next to the spinner while checking a setting', () => {
    const component = renderWithI18nProvider(
      <NoData isLoading={true} checkMessage="checking something to test" enabler={enabler} />
    );
    expect(component).toMatchSnapshot();
  });

  test('should show a default message if reason is unknown', () => {
    const component = renderWithI18nProvider(
      <NoData
        isLoading={false}
        reason={{
          property: 'xpack.monitoring.foo.bar',
          data: 'taco',
          context: 'food',
        }}
        enabler={enabler}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
