/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type {
  MaintenanceWindowStatus,
  MaintenanceWindowUI,
  FindMaintenanceWindowsResponse,
} from '../../common';
import { transformMaintenanceWindowResponse } from './transform_maintenance_window_response';
import { INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH } from '../../common';

export async function findMaintenanceWindows({
  http,
  page,
  perPage,
  search,
  selectedStatus,
}: {
  http: HttpSetup;
  page: number;
  perPage: number;
  search: string;
  selectedStatus: MaintenanceWindowStatus[];
}): Promise<{ maintenanceWindows: MaintenanceWindowUI[]; total: number }> {
  const res = await http.get<FindMaintenanceWindowsResponse>(
    `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/_find`,
    {
      query: {
        page,
        per_page: perPage,
        search,
        status: selectedStatus,
      },
    }
  );

  return { maintenanceWindows: res.data.map(transformMaintenanceWindowResponse), total: res.total };
}
