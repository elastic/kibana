/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { renderWithI18nProvider } from '@kbn/test-jest-helpers';
import { NoData } from '.';

jest.mock('@elastic/eui-illustrations', () => ({
  megaphone: {
    id: 'megaphone',
    title: 'Megaphone',
    light: '<svg></svg>',
    dark: '<svg></svg>',
  },
}));

const mockUseCloudConnectStatus = jest.fn(() => ({
  isCloudConnectAutoopsEnabled: false,
  isLoading: false,
}));

jest.mock('../../legacy_shims', () => ({
  Legacy: {
    shims: {
      isAirGapped: false,
      useCloudConnectStatus: () => mockUseCloudConnectStatus(),
      docLinks: {
        ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
      },
    },
  },
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
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
      notifications: {
        tours: {
          isEnabled: jest.fn(() => true),
        },
      },
    },
  }),
}));

const enabler = {};
const ECH_AUTOOPS_URL = 'https://cloud.elastic.co/deployments/deployment-id';

const renderNoData = (ui) => render(<I18nProvider>{ui}</I18nProvider>);

describe('NoData', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseCloudConnectStatus.mockReturnValue({
      isCloudConnectAutoopsEnabled: false,
      isLoading: false,
    });
  });

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

  test('should show the AutoOps enabled banner on the cloud no-data path', () => {
    mockUseCloudConnectStatus.mockReturnValue({
      isCloudConnectAutoopsEnabled: true,
      isLoading: false,
      autoOpsServiceUrl: ECH_AUTOOPS_URL,
    });

    renderNoData(<NoData isLoading={false} enabler={enabler} isCloudEnabled={true} />);

    expect(screen.getByTestId('autoOpsEnabledCallout')).toBeInTheDocument();
    expect(screen.getByTestId('autoOpsEnabledCalloutOpenBtn')).toHaveAttribute(
      'href',
      ECH_AUTOOPS_URL
    );
  });

  test('should not show the AutoOps enabled banner on cloud when AutoOps is disabled', () => {
    mockUseCloudConnectStatus.mockReturnValue({
      isCloudConnectAutoopsEnabled: false,
      isLoading: false,
      autoOpsServiceUrl: ECH_AUTOOPS_URL,
    });

    renderNoData(<NoData isLoading={false} enabler={enabler} isCloudEnabled={true} />);

    expect(screen.queryByTestId('autoOpsEnabledCallout')).not.toBeInTheDocument();
  });
});
