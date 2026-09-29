/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { screen, act } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import type { InstalledPackageUIPackageListItem } from '../types';

vi.mock('../../../../../../../hooks', async () => {
  const originalModule = await vi.importActual('../../../../../../../hooks');
  return {
    ...originalModule,
    useAuthz: vi.fn(),
    useLicense: vi.fn(),
    useLink: vi.fn().mockReturnValue({
      getHref: vi.fn().mockReturnValue('/app/integrations/detail/test-1.0.0/overview'),
    }),
  };
});

vi.mock('../hooks/use_url_filters', () => {
  const mocked = {
    useViewPolicies: vi.fn().mockReturnValue({
      addViewPolicies: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_installed_integrations_actions', () => {
  const mocked = {
    useInstalledIntegrationsActions: vi.fn().mockReturnValue({
      actions: {
        bulkUninstallIntegrationsWithConfirmModal: vi.fn(),
        bulkUpgradeIntegrationsWithConfirmModal: vi.fn(),
        bulkRollbackIntegrationsWithConfirmModal: vi.fn(),
      },
      rollingbackIntegrations: [],
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_rollback_available', () => {
  const mocked = {
    useRollbackAvailablePackages: vi.fn(),
    hasPreviousVersion: vi.fn((item) => !!item.installationInfo?.previous_version),
    isRollbackTTLExpired: vi.fn((item) => item.installationInfo?.is_rollback_ttl_expired ?? false),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../../services', () => {
  const mocked = {
    ExperimentalFeaturesService: {
      get: vi.fn().mockReturnValue({ enablePackageRollback: true }),
    },
    doesPackageHaveIntegrations: (pkg: any) => (pkg.policy_templates || []).length > 1,
  };
  return { ...mocked, default: mocked };
});

import { useAuthz, useLicense } from '../../../../../../../hooks';
import { useRollbackAvailablePackages } from '../hooks/use_rollback_available';
import { useInstalledIntegrationsActions } from '../hooks/use_installed_integrations_actions';

import { InstalledIntegrationsTable } from './installed_integrations_table';

const mockUseAuthz = useAuthz as Mock;
const mockUseLicense = useLicense as Mock;
const mockUseRollbackAvailablePackages = useRollbackAvailablePackages as Mock;
const mockUseInstalledIntegrationsActions = useInstalledIntegrationsActions as Mock;

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
    setPagination: vi.fn(),
  };

  const defaultSelection = {
    selectedItems: [],
    setSelectedItems: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

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
      isEnterprise: vi.fn().mockReturnValue(true),
    });

    mockUseRollbackAvailablePackages.mockReturnValue({
      'test-package': true,
    });

    mockUseInstalledIntegrationsActions.mockReturnValue({
      actions: {
        bulkUninstallIntegrationsWithConfirmModal: vi.fn(),
        bulkUpgradeIntegrationsWithConfirmModal: vi.fn(),
        bulkRollbackIntegrationsWithConfirmModal: vi.fn(),
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
          bulkUninstallIntegrationsWithConfirmModal: vi.fn(),
          bulkUpgradeIntegrationsWithConfirmModal: vi.fn(),
          bulkRollbackIntegrationsWithConfirmModal: vi.fn(),
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
