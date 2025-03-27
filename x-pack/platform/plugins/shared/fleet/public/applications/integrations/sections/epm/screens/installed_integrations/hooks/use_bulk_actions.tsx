/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useQueries, useQueryClient } from '@tanstack/react-query';

import {
  sendBulkUninstallPackagesForRq,
  sendBulkUpgradePackagesForRq,
  sendGetOneBulkUninstallPackagesForRq,
  sendGetOneBulkUpgradePackagesForRq,
  useStartServices,
} from '../../../../../../../hooks';

import type { InstalledPackageUIPackageListItem } from '../types';

interface PollAction {
  taskId: string;
  type: 'bulk_upgrade' | 'bulk_uninstall';
  integrations: InstalledPackageUIPackageListItem[];
}

export const bulkActionsContext = React.createContext<{
  upgradingIntegrations: InstalledPackageUIPackageListItem[];
  uninstallingIntegrations: InstalledPackageUIPackageListItem[];
  bulkActions: {
    setPollingBulkActions: React.Dispatch<React.SetStateAction<PollAction[]>>;
  };
}>({
  upgradingIntegrations: [],
  uninstallingIntegrations: [],
  bulkActions: {
    setPollingBulkActions: () => {},
  },
});

export const BulkActionContextProvider: React.FunctionComponent<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    notifications: { toasts },
  } = useStartServices();

  const queryClient = useQueryClient();
  const [pollingBulkActions, setPollingBulkActions] = useState<PollAction[]>([]);

  const upgradingIntegrations = useMemo(() => {
    return pollingBulkActions
      .filter((action) => action.type === 'bulk_upgrade')
      .flatMap((action) => action.integrations);
  }, [pollingBulkActions]);

  const uninstallingIntegrations = useMemo(() => {
    return pollingBulkActions
      .filter((action) => action.type === 'bulk_uninstall')
      .flatMap((action) => action.integrations);
  }, [pollingBulkActions]);

  // Poll for task results
  useQueries({
    queries: pollingBulkActions.map((action) => ({
      queryKey: ['bulk-action-packages', action.taskId],
      queryFn: async () => {
        const res =
          action.type === 'bulk_upgrade'
            ? await sendGetOneBulkUpgradePackagesForRq(action.taskId)
            : await sendGetOneBulkUninstallPackagesForRq(action.taskId);

        if (res.status !== 'pending') {
          await queryClient.invalidateQueries(['get-packages']);
          setPollingBulkActions((actions) => actions.filter((a) => a.taskId !== action.taskId));

          if (res.status === 'success') {
            // TODO update copy and view integrations https://github.com/elastic/kibana/issues/209892
            toasts.addSuccess({
              title:
                action.type === 'bulk_upgrade'
                  ? i18n.translate(
                      'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUpgradeSuccessTitle',
                      {
                        defaultMessage: 'Upgrade succeeded',
                      }
                    )
                  : i18n.translate(
                      'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUninstallSuccessTitle',
                      {
                        defaultMessage: 'Uninstall succeeded',
                      }
                    ),
            });
          } else if (res.status === 'failed') {
            // TODO update copy and view integrations https://github.com/elastic/kibana/issues/209892
            toasts.addDanger({
              title:
                action.type === 'bulk_upgrade'
                  ? i18n.translate(
                      'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUpgradeFailedTitle',
                      {
                        defaultMessage: 'Upgrade failed',
                      }
                    )
                  : i18n.translate(
                      'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUninstallFailedTitle',
                      {
                        defaultMessage: 'Uninstall failed',
                      }
                    ),
            });
          }
        }
      },
      refetchInterval: 3 * 1000,
    })),
  });

  const bulkActions = useMemo(
    () => ({
      setPollingBulkActions,
    }),
    [setPollingBulkActions]
  );

  return (
    <bulkActionsContext.Provider
      value={{
        upgradingIntegrations,
        uninstallingIntegrations,
        bulkActions,
      }}
    >
      {children}
    </bulkActionsContext.Provider>
  );
};

export function useBulkActions() {
  const {
    upgradingIntegrations,
    uninstallingIntegrations,
    bulkActions: { setPollingBulkActions },
  } = useContext(bulkActionsContext);
  const {
    notifications: { toasts },
  } = useStartServices();

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
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate(
            'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUpgradeErrorTitle',
            {
              defaultMessage: 'Error upgrading integrations',
            }
          ),
        });
      }
    },
    [setPollingBulkActions, toasts]
  );

  const bulkUninstallIntegrations = useCallback(
    async (items: InstalledPackageUIPackageListItem[], updatePolicies?: boolean) => {
      try {
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
      } catch (error) {
        toasts.addError(error, {
          title: i18n.translate(
            'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUninstallErrorTitle',
            {
              defaultMessage: 'Error uninstalling integrations',
            }
          ),
        });
      }
    },
    [toasts]
  );

  const actions = useMemo(
    () => ({ bulkUpgradeIntegrations, bulkUninstallIntegrations }),
    [bulkUpgradeIntegrations, bulkUninstallIntegrations]
  );

  return {
    actions,
    upgradingIntegrations,
    uninstallingIntegrations,
  };
}
