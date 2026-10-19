/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { waitFor } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import type { PackageInfo } from '../../../../../types';
import { InstallStatus } from '../../../../../types';

import { AssetsPage } from './assets';

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  useGetPackageInstallStatus: jest.fn(),
  useLink: jest.fn().mockReturnValue({ getPath: jest.fn().mockReturnValue('/overview') }),
  useStartServices: jest.fn().mockReturnValue({ docLinks: { links: { fleet: {} } } }),
  useUIExtension: jest.fn().mockReturnValue(undefined),
  useAuthz: jest.fn().mockReturnValue({ integrations: { readPackageInfo: true } }),
  useFleetStatus: jest.fn().mockReturnValue({ spaceId: 'default' }),
  useConfig: jest.fn().mockReturnValue({}),
  useConfirmForceInstall: jest.fn().mockReturnValue(jest.fn()),
  useInstallPackage: jest.fn().mockReturnValue(jest.fn()),
  sendGetBulkAssets: jest.fn().mockResolvedValue({ data: { items: [] } }),
}));

jest.mock('../../../components/side_bar_column', () => ({ SideBarColumn: () => null }));

jest.mock('./deferred_assets_section', () => ({
  DeferredAssetsSection: ({
    deferredInstallations,
  }: {
    deferredInstallations: Array<{ id: string }>;
  }) => (
    <div data-test-subj="deferredAssets">{deferredInstallations.map(({ id }) => id).join(',')}</div>
  ),
}));

const { useGetPackageInstallStatus, sendGetBulkAssets } = jest.requireMock('../../../../../hooks');

const createPackageInfo = (installedKibana: unknown[], installedEs: unknown[] = []) =>
  ({
    name: 'my_pkg',
    version: '1.0.0',
    title: 'My package',
    installationInfo: {
      installed_kibana_space_id: 'default',
      installed_kibana: installedKibana,
      installed_es: installedEs,
    },
  } as unknown as PackageInfo);

describe('AssetsPage deferred assets', () => {
  const render = (packageInfo: PackageInfo) => {
    const renderer = createIntegrationsTestRendererMock();
    return renderer.render(<AssetsPage packageInfo={packageInfo} refetchPackageInfo={jest.fn()} />);
  };

  beforeEach(() => {
    sendGetBulkAssets.mockClear();
    useGetPackageInstallStatus.mockReturnValue(() => ({ status: InstallStatus.installed }));
  });

  it('lists deferred workflows in the deferred installations section', async () => {
    const result = render(
      createPackageInfo([
        { id: 'wf-1', type: 'workflow', deferred: true },
        { id: 'dashboard-1', type: 'dashboard', deferred: true },
      ])
    );

    await waitFor(() => expect(result.getByTestId('deferredAssets')).toBeInTheDocument());
    expect(result.getByTestId('deferredAssets').textContent).toBe('wf-1,dashboard-1');
  });

  it('renders the deferred section when only workflows are deferred', async () => {
    const result = render(createPackageInfo([{ id: 'wf-1', type: 'workflow', deferred: true }]));

    await waitFor(() => expect(result.getByTestId('deferredAssets')).toBeInTheDocument());
    expect(result.getByTestId('deferredAssets').textContent).toBe('wf-1');
  });
});
