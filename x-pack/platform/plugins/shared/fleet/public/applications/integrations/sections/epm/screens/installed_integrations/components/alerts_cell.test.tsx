/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import type { InstalledPackageUIPackageListItem } from '../types';

const mockHttpGet = jest.fn();

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  useStartServices: jest.fn().mockReturnValue({
    http: {
      get: (...args: any[]) => mockHttpGet(...args),
      basePath: {
        prepend: (path: string) => `/mock${path}`,
      },
    },
  }),
}));

import { AlertsCell } from './alerts_cell';

describe('AlertsCell', () => {
  const basePackage: InstalledPackageUIPackageListItem = {
    name: 'system',
    title: 'System',
    version: '1.0.0',
    status: 'installed',
    installationInfo: {
      version: '1.0.0',
      install_source: 'registry',
      installed_kibana: [],
      installed_kibana_space_id: 'default',
    },
    icons: [],
    packagePoliciesInfo: { count: 0 },
    ui: { installation_status: 'installed' },
  } as unknown as InstalledPackageUIPackageListItem;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "-" when rules count is 0', async () => {
    mockHttpGet.mockResolvedValue({ data: [], total: 0 });

    render(<AlertsCell package={basePackage} />);

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    expect(mockHttpGet).toHaveBeenCalledWith('/api/alerting/rules/_find', {
      query: {
        filter: 'alert.attributes.tags:"System"',
        per_page: 0,
      },
    });
  });

  it('renders count as a link when rules exist', async () => {
    mockHttpGet.mockResolvedValue({ data: [], total: 3 });

    render(<AlertsCell package={basePackage} />);

    await waitFor(() => {
      expect(screen.getByTestId('installedIntegrationsAlertsLink')).toBeInTheDocument();
    });

    const link = screen.getByTestId('installedIntegrationsAlertsLink');
    expect(link).toHaveTextContent('3');
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('/app/management/insightsAndAlerting/triggersActions/rules')
    );
  });

  it('renders "-" when the API call fails', async () => {
    mockHttpGet.mockRejectedValue(new Error('API error'));

    render(<AlertsCell package={basePackage} />);

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });
});
