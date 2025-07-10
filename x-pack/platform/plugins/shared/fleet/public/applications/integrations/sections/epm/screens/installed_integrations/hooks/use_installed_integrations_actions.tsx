/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { toMountPoint } from '@kbn/react-kibana-mount';

import {
  sendBulkUninstallPackagesForRq,
  sendBulkUpgradePackagesForRq,
  sendRemovePackageForRq,
  useStartServices,
} from '../../../../../../../hooks';
import type { InstalledPackageUIPackageListItem } from '../types';
import { ConfirmBulkUninstallModal } from '../components/confirm_bulk_uninstall_modal';
import { ConfirmBulkUpgradeModal } from '../components/confirm_bulk_upgrade_modal';

import { bulkActionsContext } from './use_bulk_actions_context';

export function useInstalledIntegrationsActions() {
  const {
    upgradingIntegrations,
    uninstallingIntegrations,
    bulkActions: { setPollingBulkActions },
  } = useContext(bulkActionsContext);
  const queryClient = useQueryClient();
  const startServices = useStartServices();
  const {
    notifications: { toasts },
  } = startServices;

  const bulkUpgradeIntegrations = useCallback(
    async (items: InstalledPackageUIPackageListItem[], updatePolicies?: boolean) => {
      try {
        const res = await sendBulkUpgradePackagesForRq({
          packages: items.map((item) => ({ name: item.name })),
          upgrade_package_policies: updatePolicies,
        });

        setPollingBulkActions((actions) => [
          ...actions,
          {
            taskId: res.taskId,
            type: 'bulk_upgrade',
            integrations: items,
          },
        ]);
        toasts.addInfo({
          title: i18n.translate(
            'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUpgradeInProgressTitle',
            {
              defaultMessage: 'Upgrade in progress',
            }
          ),
          content: i18n.translate(
            'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUpgradeInProgressDescription',
            {
              defaultMessage:
                'The integrations and the policies are upgrading to the latest version.',
            }
          ),
        });
        return true;
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate(
            'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUpgradeErrorTitle',
            {
              defaultMessage: 'Error upgrading integrations',
            }
          ),
        });
        return false;
      }
    },
    [setPollingBulkActions, toasts]
  );

  const bulkUninstallIntegrations = useCallback(
    async (items: InstalledPackageUIPackageListItem[]) => {
      try {
        if (items.length === 1) {
          await sendRemovePackageForRq({
            pkgName: items[0].name,
            pkgVersion: items[0].installationInfo!.version,
          });
          await queryClient.invalidateQueries(['get-packages']);
          toasts.addSuccess({
            title: i18n.translate(
              'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUninstallSuccessTitleSingle',
              {
                defaultMessage: 'Uninstalled {pkgName}',
                values: { pkgName: items[0].name },
              }
            ),
          });
        } else {
          const res = await sendBulkUninstallPackagesForRq({
            packages: items.map((item) => ({
              name: item.name,
              version: item.installationInfo!.version,
            })),
          });

          setPollingBulkActions((actions) => [
            ...actions,
            {
              taskId: res.taskId,
              type: 'bulk_uninstall',
              integrations: items,
            },
          ]);
          toasts.addInfo({
            title: i18n.translate(
              'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUninstallInProgressTitle',
              {
                defaultMessage: 'Uninstall in progress',
              }
            ),
          });
        }

        return true;
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate(
            'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUninstallErrorTitle',
            {
              defaultMessage: 'Error uninstalling integrations',
            }
          ),
        });
        return false;
      }
    },
    [toasts, queryClient, setPollingBulkActions]
  );

  const bulkUninstallIntegrationsWithConfirmModal = useCallback(
    (selectedItems: InstalledPackageUIPackageListItem[]) => {
      return new Promise<void>((resolve, reject) => {
        const ref = startServices.overlays.openModal(
          toMountPoint(
            <ConfirmBulkUninstallModal
              onClose={() => {
                ref.close();
                resolve();
              }}
              onConfirm={async () => {
                // Error handled in bulkUninstallIntegrations
                const success = await bulkUninstallIntegrations(selectedItems);
                if (success) {
                  resolve();
                } else {
                  throw new Error('uninstall integrations failed');
                }
              }}
              selectedItems={selectedItems}
            />,
            startServices
          )
        );
      });
    },
    [startServices, bulkUninstallIntegrations]
  );

  const bulkUpgradeIntegrationsWithConfirmModal = useCallback(
    (selectedItems: InstalledPackageUIPackageListItem[]) => {
      return new Promise<void>((resolve) => {
        const ref = startServices.overlays.openModal(
          toMountPoint(
            <QueryClientProvider client={queryClient}>
              <ConfirmBulkUpgradeModal
                onClose={() => {
                  ref.close();
                  resolve();
                }}
                onConfirm={async ({ updatePolicies }) => {
                  const success = await bulkUpgradeIntegrations(selectedItems, updatePolicies);
                  if (success) {
                    resolve();
                  } else {
                    throw new Error('upgrade integrations failed');
                  }
                }}
                selectedItems={selectedItems}
              />
            </QueryClientProvider>,
            startServices
          )
        );
      });
    },
    [startServices, queryClient, bulkUpgradeIntegrations]
  );

  const actions = useMemo(
    () => ({
      bulkUpgradeIntegrationsWithConfirmModal,
      bulkUninstallIntegrationsWithConfirmModal,
    }),
    [bulkUpgradeIntegrationsWithConfirmModal, bulkUninstallIntegrationsWithConfirmModal]
  );

  return {
    actions,
    upgradingIntegrations,
    uninstallingIntegrations,
  };
}
