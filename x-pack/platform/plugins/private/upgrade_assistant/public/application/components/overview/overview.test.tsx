/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { renderWithI18n } from '@kbn/test-jest-helpers';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';

import type { ApiService } from '../../lib/api';
import type { CloudStackVersionState } from './use_cloud_stack_version_info';
import { Overview } from './overview';

const mockUseAppContext = jest.fn();
jest.mock('../../app_context', () => ({
  useAppContext: () => mockUseAppContext(),
}));

const mockUseCloudStackVersionInfo = jest.fn<
  CloudStackVersionState,
  [Pick<ApiService, 'getCloudStackVersionInfo'>, string]
>();
jest.mock('./use_cloud_stack_version_info', () => ({
  useCloudStackVersionInfo: (
    api: Pick<ApiService, 'getCloudStackVersionInfo'>,
    currentVersion: string
  ) => mockUseCloudStackVersionInfo(api, currentVersion),
}));

jest.mock('./backup_step', () => ({
  getBackupStep: () => ({ title: 'Backup', children: null }),
}));
jest.mock('./fix_issues_step', () => ({
  getFixIssuesStep: () => ({ title: 'Fix issues', children: null }),
}));
jest.mock('./upgrade_step', () => ({
  getUpgradeStep: () => ({ title: 'Upgrade', children: null }),
}));
jest.mock('./migrate_system_indices', () => ({
  getMigrateSystemIndicesStep: () => ({ title: 'Migrate system indices', children: null }),
}));
jest.mock('./logs_step', () => ({
  getLogsStep: () => ({ title: 'Logs', children: null }),
}));

const renderOverview = () =>
  renderWithI18n(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>
  );

describe('Overview', () => {
  beforeEach(() => {
    mockUseAppContext.mockReturnValue({
      featureSet: { migrateSystemIndices: false },
      services: {
        api: { getCloudStackVersionInfo: jest.fn() },
        breadcrumbs: { setBreadcrumbs: jest.fn() },
        core: { docLinks: docLinksServiceMock.createStartContract() },
      },
      plugins: { cloud: {} },
      kibanaVersionInfo: { currentMajor: 8, currentMinor: 19, currentPatch: 0 },
    });

    mockUseCloudStackVersionInfo.mockReset();
    mockUseCloudStackVersionInfo.mockReturnValue({ status: 'loading' });
  });

  it('renders the "What’s new" documentation link', () => {
    mockUseCloudStackVersionInfo.mockReturnValue({
      status: 'loaded',
      latestAvailableVersion: '9.3.2',
      minVersionToUpgradeToLatest: null,
      directUpgradeableVersionRange: null,
    });

    renderOverview();

    expect(screen.getByTestId('whatsNewLink')).toBeInTheDocument();
    expect(screen.getByTestId('whatsNewLink')).toHaveTextContent('Elastic release notes');
  });

  it('shows current version and latest available version', () => {
    mockUseCloudStackVersionInfo.mockReturnValue({
      status: 'loaded',
      latestAvailableVersion: '9.3.2',
      minVersionToUpgradeToLatest: null,
      directUpgradeableVersionRange: null,
    });

    renderOverview();

    expect(screen.getByTestId('overviewPageHeader')).toHaveTextContent('Current version: 8.19.0');
    expect(screen.getByTestId('overviewPageHeader')).toHaveTextContent(
      'Latest available version: 9.3.2'
    );
  });

  it('does not show a tooltip or direct upgrade range when no minimum version is returned', () => {
    mockUseCloudStackVersionInfo.mockReturnValue({
      status: 'loaded',
      latestAvailableVersion: '9.3.2',
      minVersionToUpgradeToLatest: null,
      directUpgradeableVersionRange: { min: '8.17.1', max: '8.19.13' },
    });

    renderOverview();

    const header = screen.getByTestId('overviewPageHeader');
    expect(header.querySelector('.euiToolTipAnchor')).toBeNull();
    expect(header).not.toHaveTextContent('From your current version, you can upgrade to');
  });

  it('shows direct upgrade range and tooltip explaining minimum required version', async () => {
    mockUseAppContext.mockReturnValue({
      ...mockUseAppContext(),
      kibanaVersionInfo: { currentMajor: 8, currentMinor: 17, currentPatch: 0 },
    });

    mockUseCloudStackVersionInfo.mockReturnValue({
      status: 'loaded',
      latestAvailableVersion: '9.3.2',
      minVersionToUpgradeToLatest: '8.19.13',
      directUpgradeableVersionRange: { min: '8.17.1', max: '8.19.13' },
    });

    renderOverview();

    await waitFor(() => {
      expect(screen.getByTestId('overviewPageHeader')).toHaveTextContent('Current version: 8.17.0');
      expect(screen.getByTestId('overviewPageHeader')).toHaveTextContent(
        'Latest available version: 9.3.2'
      );
      expect(screen.getByTestId('overviewPageHeader')).toHaveTextContent(
        'From your current version, you can upgrade to versions 8.17.1 - 8.19.13.'
      );
    });

    const header = screen.getByTestId('overviewPageHeader');
    const tooltipAnchor = header.querySelector('.euiToolTipAnchor');
    expect(tooltipAnchor).not.toBeNull();

    fireEvent.mouseOver(tooltipAnchor!);
    await waitFor(() => {
      const tooltip = document.querySelector('.euiToolTipPopover');
      expect(tooltip).not.toBeNull();
      expect(tooltip).toHaveTextContent('Upgrading to v9.3.2 requires v8.19.13.');
    });
  });
});
