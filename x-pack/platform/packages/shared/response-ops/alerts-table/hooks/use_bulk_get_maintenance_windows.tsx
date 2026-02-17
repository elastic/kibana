/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import type { QueryOptionsOverrides } from '@kbn/alerts-ui-shared/src/common/types/tanstack_query_utility_types';
import type { ServerError } from '@kbn/response-ops-alerts-apis/types';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { BulkGetMaintenanceWindowsResult } from '../apis/bulk_get_maintenance_windows';
import { bulkGetMaintenanceWindows } from '../apis/bulk_get_maintenance_windows';
import { queryKeys } from '../constants';
import { useLicense } from './use_license';

const ERROR_TITLE = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.api.bulkGetMaintenanceWindow.errorTitle',
  {
    defaultMessage: 'Error fetching maintenance windows data',
  }
);

const transformMaintenanceWindows = (
  data: BulkGetMaintenanceWindowsResult
): Map<string, MaintenanceWindow> => {
  const maintenanceWindowsMap = new Map();

  for (const maintenanceWindow of data?.maintenanceWindows ?? []) {
    maintenanceWindowsMap.set(maintenanceWindow.id, { ...maintenanceWindow });
  }

  return maintenanceWindowsMap;
};

interface UseBulkGetMaintenanceWindowsQueryParams {
  ids: string[];
  http: HttpStart;
  notifications: NotificationsStart;
  application: ApplicationStart;
  licensing: LicensingPluginStart;
}

export const useBulkGetMaintenanceWindowsQuery = (
  {
    ids,
    http,
    notifications: { toasts },
    application: { capabilities },
    licensing,
  }: UseBulkGetMaintenanceWindowsQueryParams,
  {
    enabled,
    context,
  }: Pick<QueryOptionsOverrides<typeof bulkGetMaintenanceWindows>, 'enabled' | 'context'> = {}
) => {
  const { isAtLeastPlatinum } = useLicense({ licensing });
  const hasLicense = isAtLeastPlatinum();

  // In AI4DSOC (searchAiLake tier) the maintenanceWindow capability is disabled
  const show = Boolean(capabilities.maintenanceWindow?.show);

  return useQuery({
    queryKey: queryKeys.maintenanceWindowsBulkGet(ids),
    queryFn: () => bulkGetMaintenanceWindows({ http, ids }),
    select: transformMaintenanceWindows,
    onError: (error) => {
      const serverError = error as ServerError;
      toasts.addError(
        serverError.body && serverError.body.message
          ? new Error(serverError.body.message)
          : serverError,
        {
          title: ERROR_TITLE,
        }
      );
    },
    enabled: hasLicense && show && ids.length > 0 && enabled !== false,
    context,
  });
};
