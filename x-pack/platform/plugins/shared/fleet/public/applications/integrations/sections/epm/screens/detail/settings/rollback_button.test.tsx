/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { fireEvent, waitFor } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import type { PackageInfo } from '../../../../../types';
import { InstallStatus } from '../../../../../types';
import { useLicense } from '../../../../../hooks';

import { RollbackButton } from './rollback_button';

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  useAuthz: jest.fn().mockReturnValue({ integrations: { installPackages: true } }),
  useGetPackageInstallStatus: jest
    .fn()
    .mockReturnValue(() => ({ status: InstallStatus.installed, version: '1.1.0' })),
  useConfirmForceInstall: jest.fn().mockReturnValue(jest.fn()),
  useInstallPackage: jest.fn().mockReturnValue(jest.fn()),
  useRollbackPackage: jest.fn().mockReturnValue(jest.fn()),
  useGetRollbackAvailableCheck: jest.fn().mockReturnValue({ isAvailable: true, reason: null }),
  useLicense: jest.fn(),
}));

jest.mock('../../installed_integrations/hooks/use_installed_integrations_actions', () => ({
  useInstalledIntegrationsActions: jest.fn().mockReturnValue({
    actions: {
      bulkRollbackIntegrationsWithConfirmModal: jest.fn(),
    },
  }),
}));

const getPackageInfo = (installSource: string) =>
  ({
    name: 'my_custom_integration',
    title: 'My custom integration',
    version: '1.1.0',
    installationInfo: {
      install_source: installSource,
      previous_version: '1.0.0',
      is_rollback_ttl_expired: false,
    },
  } as unknown as PackageInfo);

describe('RollbackButton', () => {
  beforeEach(() => {
    jest.mocked(useLicense).mockReturnValue({ isEnterprise: () => true } as any);
  });

  const renderAndHover = async (installSource: string, isCustomPackage: boolean) => {
    const result = createIntegrationsTestRendererMock().render(
      <RollbackButton
        packageInfo={getPackageInfo(installSource)}
        isCustomPackage={isCustomPackage}
      />
    );
    const button = result.getByTestId('rollbackButton');
    fireEvent.mouseOver(button.parentElement!);
    return { result, button };
  };

  it.each(['upload', 'custom'])(
    'should show custom or uploaded tooltip for install_source %s',
    async (installSource) => {
      const { result, button } = await renderAndHover(installSource, true);

      expect(button).toBeDisabled();
      await waitFor(() => {
        expect(
          result.getByText('Custom and uploaded integrations cannot be rolled back.')
        ).toBeInTheDocument();
      });
    }
  );

  it('should show license tooltip for registry package without enterprise license', async () => {
    jest.mocked(useLicense).mockReturnValue({ isEnterprise: () => false } as any);
    const { result, button } = await renderAndHover('registry', false);

    expect(button).toBeDisabled();
    await waitFor(() => {
      expect(
        result.getByText('Rolling back integrations requires an Enterprise license.')
      ).toBeInTheDocument();
    });
  });

  it('should enable button for registry package with enterprise license', async () => {
    const { button } = await renderAndHover('registry', false);

    expect(button).not.toBeDisabled();
  });
});
