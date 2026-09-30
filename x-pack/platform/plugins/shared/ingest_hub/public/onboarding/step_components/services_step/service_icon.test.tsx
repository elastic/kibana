/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('@kbn/fleet-plugin/public', () => ({
  useGetPackageInfoByKeyQuery: jest.fn(),
}));

jest.mock('@kbn/fleet-plugin/common', () => ({
  epmRouteService: {
    getFilePath: (path: string) => `/api/fleet/epm${path.replace('/package', '/packages')}`,
  },
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      http: {
        basePath: { prepend: (path: string) => path },
      },
    },
  }),
}));

import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';
import { ServiceIcon } from './service_icon';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

const mockUseGetPackageInfoByKeyQuery = useGetPackageInfoByKeyQuery as jest.Mock;

const BASE_SERVICE: AwsServiceMatrixEntry = {
  id: 's3',
  name: 'Amazon S3',
  category: 'storage',
  signalTypes: ['logs'],
  dataStreams: [],
  packageName: 'aws',
  deploymentMethods: [{ method: 'managed_integration' }],
  defaultEnabled: false,
  defaultEnabledInputs: [],
  showInUI: true,
};

const S3_ICON = {
  src: '/img/logo_s3.svg',
  path: '/package/aws/7.1.0/img/logo_s3.svg',
  type: 'image/svg+xml',
};
const AWS_PKG_ICON = {
  src: '/img/logo_aws.svg',
  path: '/package/aws/7.1.0/img/logo_aws.svg',
  type: 'image/svg+xml',
};
const FARGATE_ICON = {
  src: '/img/logo_fargate.svg',
  path: '/package/awsfargate/1.3.0/img/logo_fargate.svg',
  type: 'image/svg+xml',
};

const renderIcon = (service: AwsServiceMatrixEntry) =>
  render(
    <I18nProvider>
      <ServiceIcon service={service} />
    </I18nProvider>
  );

describe('ServiceIcon', () => {
  beforeEach(() => {
    mockUseGetPackageInfoByKeyQuery.mockClear();
  });

  it('shows a skeleton while the query is loading', () => {
    mockUseGetPackageInfoByKeyQuery.mockReturnValue({ isLoading: true, data: undefined });
    const { container } = renderIcon(BASE_SERVICE);
    expect(container.querySelector('.euiSkeletonRectangle')).not.toBeNull();
  });

  it('tier 1: renders an img with the policy-template icon URL', () => {
    mockUseGetPackageInfoByKeyQuery.mockReturnValue({
      isLoading: false,
      data: {
        item: {
          name: 'aws',
          version: '7.1.0',
          icons: [AWS_PKG_ICON],
          policy_templates: [{ name: 's3', icons: [S3_ICON] }],
        },
      },
    });

    const { container } = renderIcon(BASE_SERVICE);
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/api/fleet/epm/packages/aws/7.1.0/img/logo_s3.svg');
  });

  it('tier 2: falls back to the package-level icon when no policy-template match', () => {
    const service: AwsServiceMatrixEntry = {
      ...BASE_SERVICE,
      packageName: 'awsfargate',
    };

    mockUseGetPackageInfoByKeyQuery.mockReturnValue({
      isLoading: false,
      data: {
        item: {
          name: 'awsfargate',
          version: '1.3.0',
          icons: [FARGATE_ICON],
          policy_templates: [],
        },
      },
    });

    const { container } = renderIcon(service);
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe(
      '/api/fleet/epm/packages/awsfargate/1.3.0/img/logo_fargate.svg'
    );
  });

  it('tier 3: renders logoAWS EuiIcon when package returns no icons', () => {
    mockUseGetPackageInfoByKeyQuery.mockReturnValue({
      isLoading: false,
      data: { item: { name: 'aws', version: '7.1.0', icons: [], policy_templates: [] } },
    });

    const { container } = renderIcon(BASE_SERVICE);
    expect(container.querySelector('img')).toBeNull();
    expect(document.querySelector('[data-euiicon-type="logoAWS"]')).not.toBeNull();
  });

  it('tier 3: renders logoAWS EuiIcon when query returns no data', () => {
    mockUseGetPackageInfoByKeyQuery.mockReturnValue({ isLoading: false, data: undefined });

    const { container } = renderIcon(BASE_SERVICE);
    expect(container.querySelector('img')).toBeNull();
    expect(document.querySelector('[data-euiicon-type="logoAWS"]')).not.toBeNull();
  });
});
