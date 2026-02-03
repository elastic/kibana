/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, act } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import type { InstalledPackageUIPackageListItem } from '../types';

jest.mock('../../../../../../../hooks', () => {
  const originalModule = jest.requireActual('../../../../../../../hooks');
  return {
    ...originalModule,
    useAuthz: jest.fn(),
    useLicense: jest.fn(),
    useLink: jest.fn().mockReturnValue({
      getHref: jest.fn().mockReturnValue('/app/integrations/detail/test-1.0.0/overview'),
    }),
  };
});

jest.mock('../hooks/use_url_filters', () => ({
  useViewPolicies: jest.fn().mockReturnValue({
    addViewPolicies: jest.fn(),
  }),
}));

jest.mock('../hooks/use_installed_integrations_actions', () => ({
  useInstalledIntegrationsActions: jest.fn().mockReturnValue({
    actions: {
      bulkUninstallIntegrationsWithConfirmModal: jest.fn(),
      bulkUpgradeIntegrationsWithConfirmModal: jest.fn(),
      bulkRollbackIntegrationsWithConfirmModal: jest.fn(),
    },
    rollingbackIntegrations: [],
  }),
}));

jest.mock('../hooks/use_rollback_available', () => ({
  useRollbackAvailablePackages: jest.fn(),
  hasPreviousVersion: jest.fn((item) => !!item.installationInfo?.previous_version),
  isRollbackTTLExpired: jest.fn((item) => item.installationInfo?.is_rollback_ttl_expired ?? false),
}));
jest.mock('../../../../../services', () => ({
  ExperimentalFeaturesService: {
    get: jest.fn().mockReturnValue({ enablePackageRollback: true }),
  },
}));

import { useAuthz, useLicense } from '../../../../../../../hooks';
import { useRollbackAvailablePackages } from '../hooks/use_rollback_available';
import { useInstalledIntegrationsActions } from '../hooks/use_installed_integrations_actions';

import { InstalledIntegrationsTable } from './installed_integrations_table';

const mockUseAuthz = useAuthz as jest.Mock;
const mockUseLicense = useLicense as jest.Mock;
const mockUseRollbackAvailablePackages = useRollbackAvailablePackages as jest.Mock;
const mockUseInstalledIntegrationsActions = useInstalledIntegrationsActions as jest.Mock;

describe('InstalledIntegrationsTable', () => {
  const basePackage: InstalledPackageUIPackageListItem = {
    name: 'test-package',
    title: 'Test Package',
    version: '1.2.0',
    status: 'installed',
    installationInfo: {
      version: '1.2.0',
      previous_version: '1.0.0',
      install_source: 'registry',
      is_rollback_ttl_expired: false,
    },
    icons: [{ src: 'icon.svg', path: 'path/icon.svg', type: 'image/svg+xml' }],
    packagePoliciesInfo: {
      count: 0,
    },
    ui: {
      installation_status: 'installed',
    },
  } as InstalledPackageUIPackageListItem;

  const defaultPagination = {
    pagination: {
      currentPage: 1,
      pageSize: 20,
    },
    pageSizeOptions: [10, 20, 50],
    setPagination: jest.fn(),
  };

  const defaultSelection = {
    selectedItems: [],
    setSelectedItems: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthz.mockReturnValue({
      fleet: {
        readAgentPolicies: true,
      },
      integrations: {
        installPackages: true,
        upgradePackages: true,
        removePackages: true,
      },
    });

    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn().mockReturnValue(true),
    });

    mockUseRollbackAvailablePackages.mockReturnValue({
      'test-package': true,
    });

    mockUseInstalledIntegrationsActions.mockReturnValue({
      actions: {
        bulkUninstallIntegrationsWithConfirmModal: jest.fn(),
        bulkUpgradeIntegrationsWithConfirmModal: jest.fn(),
        bulkRollbackIntegrationsWithConfirmModal: jest.fn(),
      },
      rollingbackIntegrations: [],
    });
  });

  const renderComponent = (
    packages: InstalledPackageUIPackageListItem[],
    overrides?: {
      rollingbackIntegrations?: InstalledPackageUIPackageListItem[];
      rollbackAvailable?: Record<string, boolean>;
    }
  ) => {
    if (overrides?.rollingbackIntegrations !== undefined) {
      mockUseInstalledIntegrationsActions.mockReturnValue({
        actions: {
          bulkUninstallIntegrationsWithConfirmModal: jest.fn(),
          bulkUpgradeIntegrationsWithConfirmModal: jest.fn(),
          bulkRollbackIntegrationsWithConfirmModal: jest.fn(),
        },
        rollingbackIntegrations: overrides.rollingbackIntegrations,
      });
    }

    if (overrides?.rollbackAvailable) {
      mockUseRollbackAvailablePackages.mockReturnValue(overrides.rollbackAvailable);
    }

    const renderer = createIntegrationsTestRendererMock();

    const result = renderer.render(
      <InstalledIntegrationsTable
        installedPackages={packages}
        total={packages.length}
        isLoading={false}
        pagination={defaultPagination}
        selection={defaultSelection}
      />
    );

    return {
      ...result,
      rerender: (newPackages: InstalledPackageUIPackageListItem[]) => {
        return renderer.render(
          <InstalledIntegrationsTable
            installedPackages={newPackages}
            total={newPackages.length}
            isLoading={false}
            pagination={defaultPagination}
            selection={defaultSelection}
          />
        );
      },
    };
  };

  describe('Rollback action', () => {
    it('should be disabled when package is rolling back', async () => {
      const rollingBackPackage = {
        ...basePackage,
        ui: { installation_status: 'rolling_back' },
      } as InstalledPackageUIPackageListItem;
      renderComponent([rollingBackPackage], {
        rollingbackIntegrations: [rollingBackPackage],
        rollbackAvailable: { 'test-package': true },
      });

      const actionButton = screen.getByTestId('euiCollapsedItemActionsButton');
      await act(async () => {
        actionButton.click();
      });
      const rollbackButton = screen.getByTestId('rollbackButton');
      expect(rollbackButton).toBeDisabled();
    });

    it('should be enabled when package is available and not rolling back', async () => {
      renderComponent([basePackage], {
        rollingbackIntegrations: [],
        rollbackAvailable: { 'test-package': true },
      });
      const actionButton = screen.getByTestId('euiCollapsedItemActionsButton');
      await act(async () => {
        actionButton.click();
      });
      const rollbackButton = screen.getByTestId('rollbackButton');
      expect(rollbackButton).toBeEnabled();
    });

    it('should be disabled when package is not available for rollback', async () => {
      renderComponent([basePackage], {
        rollingbackIntegrations: [],
        rollbackAvailable: { 'test-package': false },
      });
      const actionButton = screen.getByTestId('euiCollapsedItemActionsButton');
      await act(async () => {
        actionButton.click();
      });
      const rollbackButton = screen.getByTestId('rollbackButton');
      expect(rollbackButton).toBeDisabled();
    });
  });
});
