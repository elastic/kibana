/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import { INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH } from '../../../common';

export const deleteMaintenanceWindow = async ({
  http,
  maintenanceWindowId,
}: {
  http: HttpSetup;
  maintenanceWindowId: string;
}): Promise<void> => {
  await http.delete<Promise<void>>(
    `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/${encodeURIComponent(maintenanceWindowId)}`
  );
};
