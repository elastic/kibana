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
  sendBulkUpgradePackagesForRq,
  sendGetOneBulkUpgradePackagesForRq,
  useStartServices,
} from '../../../../../../../hooks';

import type { InstalledPackageUIPackageListItem } from '../types';

export const bulkActionsContext = React.createContext<{
  upgradingIntegrations: InstalledPackageUIPackageListItem[];
  bulkActions: {
    setBulkUpgradeActions: React.Dispatch<
      React.SetStateAction<
        Array<{
          taskId: string;
          upgradingIntegrations: InstalledPackageUIPackageListItem[];
        }>
      >
    >;
  };
}>({
  upgradingIntegrations: [],
  bulkActions: {
    setBulkUpgradeActions: () => {},
  },
});

export const BulkActionContextProvider: React.FunctionComponent<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    notifications: { toasts },
  } = useStartServices();

  const queryClient = useQueryClient();
  const [bulkUpgradeActions, setBulkUpgradeActions] = useState<
    Array<{
      taskId: string;
      upgradingIntegrations: InstalledPackageUIPackageListItem[];
    }>
  >([]);

  const upgradingIntegrations = useMemo(() => {
    return bulkUpgradeActions.flatMap((action) => action.upgradingIntegrations);
  }, [bulkUpgradeActions]);

  // Poll for upgrade task results
  useQueries({
    queries: bulkUpgradeActions.map((action) => ({
      queryKey: ['bulk-upgrade-packages', action.taskId],
      queryFn: async () => {
        const res = await sendGetOneBulkUpgradePackagesForRq(action.taskId);

        if (res.status !== 'pending') {
          await queryClient.invalidateQueries(['get-packages']);
          setBulkUpgradeActions((actions) => actions.filter((a) => a.taskId !== action.taskId));

          if (res.status === 'success') {
            // TODO update copy and view integrations https://github.com/elastic/kibana/issues/209892
            toasts.addSuccess({
              title: i18n.translate(
                'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUpgradeSuccessTitle',
                {
                  defaultMessage: 'Upgrade succeeded',
                }
              ),
            });
          } else if (res.status === 'failed') {
            // TODO update copy and view integrations https://github.com/elastic/kibana/issues/209892
            toasts.addDanger({
              title: i18n.translate(
                'xpack.fleet.epmInstalledIntegrations.bulkActions.bulkUpgradeFailedTitle',
                {
                  defaultMessage: 'Upgrade failed',
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
      setBulkUpgradeActions,
    }),
    [setBulkUpgradeActions]
  );

  return (
    <bulkActionsContext.Provider
      value={{
        upgradingIntegrations,
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
    bulkActions: { setBulkUpgradeActions },
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

        setBulkUpgradeActions((actions) => [
          ...actions,
          {
            taskId: res.taskId,
            upgradingIntegrations: items,
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
    [setBulkUpgradeActions, toasts]
  );

  return {
    actions: {
      bulkUpgradeIntegrations,
    },
    upgradingIntegrations,
  };
}
