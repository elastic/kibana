/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import type { MaintenanceWindow } from '../../../common';
import type { UpdateMaintenanceWindowRequestBody } from '../../../common/routes/maintenance_window/apis/update';
import type { MaintenanceWindowResponse } from '../../../common/routes/maintenance_window/response';

import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../common';
import { transformMaintenanceWindowResponse } from './transform_maintenance_window_response';

export interface UpdateParams {
  title: MaintenanceWindow['title'];
  duration: MaintenanceWindow['duration'];
  rRule: MaintenanceWindow['rRule'];
  categoryIds?: MaintenanceWindow['categoryIds'];
  scopedQuery?: MaintenanceWindow['scopedQuery'];
}

const transformUpdateBodySchema = (
  updateParams: UpdateParams
): UpdateMaintenanceWindowRequestBody => {
  return {
    title: updateParams.title,
    duration: updateParams.duration,
    r_rule: updateParams.rRule as UpdateMaintenanceWindowRequestBody['r_rule'],
    ...(updateParams.categoryIds !== undefined
      ? {
          category_ids:
            updateParams.categoryIds as UpdateMaintenanceWindowRequestBody['category_ids'],
        }
      : {}),
    ...(updateParams.scopedQuery !== undefined ? { scoped_query: updateParams.scopedQuery } : {}),
  };
};

export async function updateMaintenanceWindow({
  http,
  maintenanceWindowId,
  updateParams,
}: {
  http: HttpSetup;
  maintenanceWindowId: string;
  updateParams: UpdateParams;
}): Promise<MaintenanceWindow> {
  const res = await http.post<MaintenanceWindowResponse>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window/${encodeURIComponent(
      maintenanceWindowId
    )}`,
    { body: JSON.stringify(transformUpdateBodySchema(updateParams)) }
  );

  return transformMaintenanceWindowResponse(res);
}
