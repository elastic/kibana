/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { MaintenanceWindow } from '../../application/maintenance_window/types';
import { MaintenanceWindowClientApi } from '../../types';
import { withAlertingSpan } from '../lib';

interface GetMaintenanceWindowsOpts {
  fakeRequest: KibanaRequest;
  getMaintenanceWindowClientWithRequest(request: KibanaRequest): MaintenanceWindowClientApi;
  logger: Logger;
  ruleId: string;
  ruleTypeId: string;
  ruleTypeCategory: string;
}

interface FilterMaintenanceWindowsOpts {
  maintenanceWindows: MaintenanceWindow[];
  withScopedQuery: boolean;
}

export const filterMaintenanceWindows = ({
  maintenanceWindows,
  withScopedQuery,
}: FilterMaintenanceWindowsOpts): MaintenanceWindow[] => {
  const filteredMaintenanceWindows = maintenanceWindows.filter(({ scopedQuery }) => {
    if (withScopedQuery && scopedQuery) {
      return true;
    } else if (!withScopedQuery && !scopedQuery) {
      return true;
    }

    return false;
  });

  return filteredMaintenanceWindows;
};

export const filterMaintenanceWindowsIds = ({
  maintenanceWindows,
  withScopedQuery,
}: FilterMaintenanceWindowsOpts): string[] => {
  const filteredMaintenanceWindows = filterMaintenanceWindows({
    maintenanceWindows,
    withScopedQuery,
  });

  return filteredMaintenanceWindows.map(({ id }) => id);
};

export const getMaintenanceWindows = async (
  opts: GetMaintenanceWindowsOpts
): Promise<MaintenanceWindow[]> => {
  return await withAlertingSpan('alerting:load-maintenance-windows', async () => {
    const {
      getMaintenanceWindowClientWithRequest,
      fakeRequest,
      logger,
      ruleTypeId,
      ruleId,
      ruleTypeCategory,
    } = opts;
    const maintenanceWindowClient = getMaintenanceWindowClientWithRequest(fakeRequest);

    let activeMaintenanceWindows: MaintenanceWindow[] = [];
    try {
      activeMaintenanceWindows = await maintenanceWindowClient.getActiveMaintenanceWindows();
    } catch (err) {
      logger.error(
        `error getting active maintenance window for ${ruleTypeId}:${ruleId} ${err.message}`
      );
    }

    const maintenanceWindows = activeMaintenanceWindows.filter(({ categoryIds }) => {
      // If category IDs array doesn't exist: allow all
      if (!Array.isArray(categoryIds)) {
        return true;
      }
      // If category IDs array exist: check category
      if ((categoryIds as string[]).includes(ruleTypeCategory)) {
        return true;
      }
      return false;
    });

    return maintenanceWindows;
  });
};
