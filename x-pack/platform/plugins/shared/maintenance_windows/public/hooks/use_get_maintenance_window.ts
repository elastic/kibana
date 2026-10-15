/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../utils/kibana_react';
import { getMaintenanceWindow } from '../services/get';
import { convertFromMaintenanceWindowToForm } from '../helpers/convert_from_maintenance_window_to_form';

export const useGetMaintenanceWindow = (maintenanceWindowId: string) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = async () => {
    const maintenanceWindow = await getMaintenanceWindow({ http, maintenanceWindowId });

    // v1 has a filter when scope.alerting is enabled and has a kql string or filters.
    const hasScopedQuery = maintenanceWindow.scope?.alerting?.enabled
      ? Boolean(
          maintenanceWindow.scope.alerting.kql || maintenanceWindow.scope.alerting.filters?.length
        )
      : !!maintenanceWindow.scopedQuery;
    const hasOldCategorySettings = maintenanceWindow.categoryIds
      ? maintenanceWindow.categoryIds.length > 0 && maintenanceWindow.categoryIds.length < 3
      : false;

    const showMultipleSolutionsWarning = !hasScopedQuery && hasOldCategorySettings;
    return {
      maintenanceWindow: convertFromMaintenanceWindowToForm(maintenanceWindow),
      showMultipleSolutionsWarning,
    };
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.maintenanceWindows.getMaintenanceWindowFailure', {
        defaultMessage: 'Unable to get maintenance window.',
      })
    );
  };

  const { isInitialLoading, isLoading, data, isError } = useQuery({
    queryKey: ['getMaintenanceWindow', maintenanceWindowId],
    queryFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    retry: false,
    cacheTime: 0,
  });

  return {
    maintenanceWindow: data?.maintenanceWindow,
    showMultipleSolutionsWarning: data?.showMultipleSolutionsWarning,
    isLoading: isLoading || isInitialLoading,
    isError,
  };
};
