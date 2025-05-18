/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toMountPoint } from '@kbn/react-kibana-mount';
import { act } from 'react-dom/test-utils';

import {
  sendRemovePackageForRq,
  sendBulkUninstallPackagesForRq,
  sendBulkUpgradePackagesForRq,
} from '../../../../../../../hooks/use_request/epm';

import { createFleetTestRendererMock } from '../../../../../../../mock';

import { useInstalledIntegrationsActions } from './use_installed_integrations_actions';

jest.mock('@kbn/react-kibana-mount');
jest.mock('../../../../../../../hooks/use_request/epm', () => ({
  ...jest.requireActual('../../../../../../../hooks/use_request/epm'),
  sendRemovePackageForRq: jest.fn(),
  sendBulkUninstallPackagesForRq: jest.fn(),
  sendBulkUpgradePackagesForRq: jest.fn(),
}));

describe('useInstalledIntegrationsActions', () => {
  beforeEach(() => {
    jest.mocked(sendRemovePackageForRq).mockReset();
    jest.mocked(sendBulkUninstallPackagesForRq).mockReset();
    jest.mocked(sendBulkUpgradePackagesForRq).mockReset();
    jest.mocked(toMountPoint).mockReset();
  });
  describe('bulkUninstallIntegrationsWithConfirmModal', () => {
    it('should work with single integration', async () => {
      const renderer = createFleetTestRendererMock();
      const res = renderer.renderHook(() => useInstalledIntegrationsActions());
      const bulkUninstallIntegrationsWithConfirmModalResult =
        res.result.current.actions.bulkUninstallIntegrationsWithConfirmModal([
          {
            name: 'test',
            version: '1.2.0',
            installationInfo: {
              version: '1.0.0',
            },
          },
        ] as any);

      // Mount the modal
      const modal = jest.mocked(toMountPoint).mock.lastCall![0];
      const modalResult = renderer.render(modal as any);

      modalResult.getByTestId('confirmModalConfirmButton').click();

      await expect(bulkUninstallIntegrationsWithConfirmModalResult).resolves;

      expect(sendRemovePackageForRq).toBeCalledTimes(1);
      expect(sendRemovePackageForRq).toBeCalledWith({ pkgName: 'test', pkgVersion: '1.0.0' });
    });

    it('should work with multiple integrations', async () => {
      const renderer = createFleetTestRendererMock();
      const res = renderer.renderHook(() => useInstalledIntegrationsActions());
      const bulkUninstallIntegrationsWithConfirmModalResult =
        res.result.current.actions.bulkUninstallIntegrationsWithConfirmModal([
          {
            name: 'test',
            version: '1.2.0',
            installationInfo: {
              version: '1.0.0',
            },
          },
          {
            name: 'test2',
            version: '1.2.0',
            installationInfo: {
              version: '1.1.0',
            },
          },
        ] as any);

      // Mount the modal
      const modal = jest.mocked(toMountPoint).mock.lastCall![0];
      const modalResult = renderer.render(modal as any);

      modalResult.getByTestId('confirmModalConfirmButton').click();

      await expect(bulkUninstallIntegrationsWithConfirmModalResult).resolves;

      expect(sendBulkUninstallPackagesForRq).toBeCalledTimes(1);
      expect(sendBulkUninstallPackagesForRq).toBeCalledWith({
        packages: [
          { name: 'test', version: '1.0.0' },
          { name: 'test2', version: '1.1.0' },
        ],
      });
    });

    it('should support canceling action', async () => {
      const renderer = createFleetTestRendererMock();
      const res = renderer.renderHook(() => useInstalledIntegrationsActions());
      const bulkUninstallIntegrationsWithConfirmModalResult =
        res.result.current.actions.bulkUninstallIntegrationsWithConfirmModal([
          {
            name: 'test',
            version: '1.2.0',
            installationInfo: {
              version: '1.0.0',
            },
          },
        ] as any);

      // Mount the modal
      const modal = jest.mocked(toMountPoint).mock.lastCall![0];
      const modalResult = renderer.render(modal as any);

      modalResult.getByTestId('confirmModalCancelButton').click();

      await expect(bulkUninstallIntegrationsWithConfirmModalResult).resolves;

      expect(sendRemovePackageForRq).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpgradeIntegrationsWithConfirmModal', () => {
    it('should work with single integration', async () => {
      const renderer = createFleetTestRendererMock();
      const res = renderer.renderHook(() => useInstalledIntegrationsActions());
      const bulkUpgradeIntegrationsWithConfirmModalResult =
        res.result.current.actions.bulkUpgradeIntegrationsWithConfirmModal([
          {
            name: 'test',
            version: '1.2.0',
            installationInfo: {
              version: '1.0.0',
            },
          },
        ] as any);

      // Mount the modal
      const modal = jest.mocked(toMountPoint).mock.lastCall![0];
      const modalResult = renderer.render(modal as any);

      modalResult.getByTestId('confirmModalConfirmButton').click();

      await expect(bulkUpgradeIntegrationsWithConfirmModalResult).resolves;

      expect(sendBulkUpgradePackagesForRq).toBeCalledTimes(1);
      expect(sendBulkUpgradePackagesForRq).toBeCalledWith({
        packages: [{ name: 'test' }],
        upgrade_package_policies: false,
      });
    });

    it('should allow to upgrade related package policies', async () => {
      const renderer = createFleetTestRendererMock();
      const res = renderer.renderHook(() => useInstalledIntegrationsActions());
      const bulkUpgradeIntegrationsWithConfirmModalResult =
        res.result.current.actions.bulkUpgradeIntegrationsWithConfirmModal([
          {
            name: 'test',
            version: '1.2.0',
            installationInfo: {
              version: '1.0.0',
            },
          },
        ] as any);

      // Mount the modal
      const modal = jest.mocked(toMountPoint).mock.lastCall![0];
      const modalResult = renderer.render(modal as any);

      act(() => modalResult.getByTestId('upgradeIntegrationsPoliciesSwitch').click());
      act(() => modalResult.getByTestId('confirmModalConfirmButton').click());

      await expect(bulkUpgradeIntegrationsWithConfirmModalResult).resolves;

      expect(sendBulkUpgradePackagesForRq).toBeCalledTimes(1);
      expect(sendBulkUpgradePackagesForRq).toBeCalledWith({
        packages: [{ name: 'test' }],
        upgrade_package_policies: true,
      });
    });

    it('should work with multiple integrations', async () => {
      const renderer = createFleetTestRendererMock();
      const res = renderer.renderHook(() => useInstalledIntegrationsActions());
      const bulkUpgradeIntegrationsWithConfirmModalResult =
        res.result.current.actions.bulkUpgradeIntegrationsWithConfirmModal([
          {
            name: 'test',
            version: '1.2.0',
            installationInfo: {
              version: '1.0.0',
            },
          },
          {
            name: 'test2',
            version: '1.2.0',
            installationInfo: {
              version: '1.1.0',
            },
          },
        ] as any);

      // Mount the modal
      const modal = jest.mocked(toMountPoint).mock.lastCall![0];
      const modalResult = renderer.render(modal as any);
      act(() => modalResult.getByTestId('confirmModalConfirmButton').click());

      await expect(bulkUpgradeIntegrationsWithConfirmModalResult).resolves;

      expect(sendBulkUpgradePackagesForRq).toBeCalledTimes(1);
      expect(sendBulkUpgradePackagesForRq).toBeCalledWith({
        packages: [{ name: 'test' }, { name: 'test2' }],
        upgrade_package_policies: false,
      });
    });

    it('should support cancelling', async () => {
      const renderer = createFleetTestRendererMock();
      const res = renderer.renderHook(() => useInstalledIntegrationsActions());
      const bulkUpgradeIntegrationsWithConfirmModalResult =
        res.result.current.actions.bulkUpgradeIntegrationsWithConfirmModal([
          {
            name: 'test',
            version: '1.2.0',
            installationInfo: {
              version: '1.0.0',
            },
          },
        ] as any);

      // Mount the modal
      const modal = jest.mocked(toMountPoint).mock.lastCall![0];
      const modalResult = renderer.render(modal as any);

      modalResult.getByTestId('confirmModalCancelButton').click();

      await expect(bulkUpgradeIntegrationsWithConfirmModalResult).resolves;

      expect(sendBulkUpgradePackagesForRq).not.toHaveBeenCalled();
    });
  });
});
