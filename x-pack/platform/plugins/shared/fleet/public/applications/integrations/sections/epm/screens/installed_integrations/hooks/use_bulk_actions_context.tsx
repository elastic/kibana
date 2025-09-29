/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useQueries, useQueryClient } from '@tanstack/react-query';

import {
  sendGetBulkRollbackInfoPackagesForRq,
  sendGetOneBulkUninstallPackagesForRq,
  sendGetOneBulkUpgradePackagesForRq,
  useStartServices,
} from '../../../../../../../hooks';

import type { InstalledPackageUIPackageListItem } from '../types';

interface PollAction {
  taskId: string;
  type: 'bulk_upgrade' | 'bulk_uninstall' | 'bulk_rollback';
  integrations: InstalledPackageUIPackageListItem[];
}

export const bulkActionsContext = React.createContext<{
  upgradingIntegrations: InstalledPackageUIPackageListItem[];
  uninstallingIntegrations: InstalledPackageUIPackageListItem[];
  rollingbackIntegrations: InstalledPackageUIPackageListItem[];
  bulkActions: {
    setPollingBulkActions: React.Dispatch<React.SetStateAction<PollAction[]>>;
    setActionCompletedCallback: React.Dispatch<React.SetStateAction<Function | undefined>>;
  };
}>({
  upgradingIntegrations: [],
  uninstallingIntegrations: [],
  rollingbackIntegrations: [],
  bulkActions: {
    setPollingBulkActions: () => {},
    setActionCompletedCallback: () => {},
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
  const [actionCompletedCallback, setActionCompletedCallback] = useState<Function | undefined>();

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

  const rollingbackIntegrations = useMemo(() => {
    return pollingBulkActions
      .filter((action) => action.type === 'bulk_rollback')
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
            : action.type === 'bulk_uninstall'
            ? await sendGetOneBulkUninstallPackagesForRq(action.taskId)
            : await sendGetBulkRollbackInfoPackagesForRq(action.taskId);

        if (res.status !== 'pending') {
          await queryClient.invalidateQueries(['get-packages']);
          setPollingBulkActions((actions) => actions.filter((a) => a.taskId !== action.taskId));

          if (res.status === 'success') {
            toasts.addSuccess({
              title:
                action.type === 'bulk_upgrade'
                  ? i18n.translate(
                      'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUpgradeSuccessTitle',
                      {
                        defaultMessage: 'Upgrade succeeded',
                      }
                    )
                  : action.type === 'bulk_uninstall'
                  ? i18n.translate(
                      'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUninstallSuccessTitle',
                      {
                        defaultMessage: 'Uninstall succeeded',
                      }
                    )
                  : i18n.translate(
                      'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkRollbackSuccessTitle',
                      {
                        defaultMessage: 'Rollback succeeded',
                      }
                    ),
            });
            if (actionCompletedCallback) {
              actionCompletedCallback('success');
            }
          } else if (res.status === 'failed') {
            const errorMessage = res.error?.message
              ? res.error?.message
              : res.results
              ? res.results
                  .filter((result) => result.error)
                  .map((result) => `${result.name}: ${result.error?.message}`)
                  .join('\n')
              : 'Unexpected error';
            const error = new Error(errorMessage);

            toasts.addError(error, {
              title:
                action.type === 'bulk_upgrade'
                  ? i18n.translate(
                      'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUpgradeFailedTitle',
                      {
                        defaultMessage: 'Upgrade failed',
                      }
                    )
                  : action.type === 'bulk_uninstall'
                  ? i18n.translate(
                      'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUninstallFailedTitle',
                      {
                        defaultMessage: 'Uninstall failed',
                      }
                    )
                  : i18n.translate(
                      'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkRollbackFailedTitle',
                      {
                        defaultMessage: 'Rollback failed',
                      }
                    ),
            });
            if (actionCompletedCallback) {
              actionCompletedCallback('failed');
            }
          }
        }
      },
      refetchInterval: 3 * 1000,
    })),
  });

  const bulkActions = useMemo(
    () => ({
      setPollingBulkActions,
      setActionCompletedCallback,
    }),
    [setPollingBulkActions, setActionCompletedCallback]
  );

  return (
    <bulkActionsContext.Provider
      value={{
        upgradingIntegrations,
        uninstallingIntegrations,
        rollingbackIntegrations,
        bulkActions,
      }}
    >
      {children}
    </bulkActionsContext.Provider>
  );
};
