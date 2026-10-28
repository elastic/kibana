/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import type { Capabilities } from '@kbn/core/public';
import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';
import { MaintenanceWindowsPage } from './home';
import { MAINTENANCE_WINDOW_FEATURE_ID } from '../../common';

jest.mock('../hooks/use_find_maintenance_windows');
jest.mock('../hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));
jest.mock('./maintenance_windows_list', () => ({
  MaintenanceWindowsList: () => <div data-test-subj="maintenance-windows-list" />,
}));

const { useFindMaintenanceWindows: useFindMaintenanceWindowsMock } = jest.requireMock(
  '../hooks/use_find_maintenance_windows'
);

const platinumLicense = licensingMock.createLicense({
  license: { type: 'platinum' },
});

const goldLicense = licensingMock.createLicense({
  license: { type: 'gold' },
});

const writeCapabilities = {
  [MAINTENANCE_WINDOW_FEATURE_ID]: { show: true, save: true },
} as unknown as Capabilities;

const readOnlyCapabilities = {
  [MAINTENANCE_WINDOW_FEATURE_ID]: { show: true, save: false },
} as unknown as Capabilities;

const sampleWindow = { id: '1', title: 'Window' };

describe('MaintenanceWindowsPage', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    useFindMaintenanceWindowsMock.mockReturnValue({
      isLoading: false,
      isInitialLoading: false,
      data: { maintenanceWindows: [sampleWindow], total: 1 },
      refetch: jest.fn(),
    });
  });

  const renderPage = ({
    capabilities = writeCapabilities,
    license = platinumLicense,
  }: {
    capabilities?: Capabilities;
    license?: ReturnType<typeof licensingMock.createLicense>;
  } = {}) => {
    appMockRenderer = createAppMockRenderer({ capabilities, license });
    return appMockRenderer.render(<MaintenanceWindowsPage />);
  };

  it('renders the AppHeader title, description, and primary create action', async () => {
    const { getByTestId, findByTestId } = renderPage();

    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Maintenance Windows');
    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Suppress rule notifications for scheduled periods of time.'
    );
    expect(await findByTestId('mw-create-button')).toHaveTextContent('Create window');
    expect(getByTestId('maintenance-windows-list')).toBeInTheDocument();

    await openAppMenuOverflow();
    const docLink = await findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation);
    expect(docLink).toHaveAttribute(
      'href',
      appMockRenderer.coreStart.docLinks.links.alerting.maintenanceWindows
    );
    expect(docLink).toHaveAttribute('target', '_blank');
  });

  it('keeps the header and shows the empty prompt without a header create button', () => {
    useFindMaintenanceWindowsMock.mockReturnValue({
      isLoading: false,
      isInitialLoading: false,
      data: { maintenanceWindows: [], total: 0 },
      refetch: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderPage();

    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Maintenance Windows');
    expect(getByTestId('mw-empty-prompt')).toBeInTheDocument();
    expect(queryByTestId('maintenance-windows-list')).not.toBeInTheDocument();
    expect(
      getByTestId('mw-empty-prompt').querySelector('[data-test-subj="mw-create-button"]')
    ).toBeInTheDocument();
  });

  it('keeps the header and shows the license prompt without a create action', async () => {
    const { getByTestId, queryByTestId } = renderPage({ license: goldLicense });

    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Maintenance Windows');
    expect(getByTestId('mw-license-prompt')).toBeInTheDocument();
    await waitFor(() => {
      expect(queryByTestId('mw-create-button')).not.toBeInTheDocument();
    });
  });

  it('shows a read-only badge and hides the create action', async () => {
    const { getByTestId, queryByTestId } = renderPage({
      capabilities: readOnlyCapabilities,
    });

    expect(getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Maintenance Windows');
    expect(getByTestId('mw-read-only-badge')).toHaveTextContent('Read only');
    await waitFor(() => {
      expect(queryByTestId('mw-create-button')).not.toBeInTheDocument();
    });
    expect(getByTestId('maintenance-windows-list')).toBeInTheDocument();
  });
});
