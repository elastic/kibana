/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import type { MaintenanceWindowUI, MaintenanceWindowResponse } from '../../common';

import { INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH } from '../../common';
import { transformMaintenanceWindowResponse } from './transform_maintenance_window_response';

export async function finishMaintenanceWindow({
  http,
  maintenanceWindowId,
}: {
  http: HttpSetup;
  maintenanceWindowId: string;
}): Promise<MaintenanceWindowUI> {
  const res = await http.post<MaintenanceWindowResponse>(
    `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/${encodeURIComponent(
      maintenanceWindowId
    )}/_finish`
  );

  return transformMaintenanceWindowResponse(res);
}
