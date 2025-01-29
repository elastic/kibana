/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateMaintenanceWindowRequestBodyV1 } from '../../../../../../../common/routes/maintenance_window/apis/update';
import { UpdateMaintenanceWindowParams } from '../../../../../../application/maintenance_window/methods/update/types';

export const transformUpdateBody = (
  updateBody: UpdateMaintenanceWindowRequestBodyV1
): UpdateMaintenanceWindowParams['data'] => {
  const {
    title,
    enabled,
    duration,
    r_rule: rRule,
    category_ids: categoryIds,
    scoped_query: scopedQuery,
  } = updateBody;

  return {
    ...(title !== undefined ? { title } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(rRule !== undefined ? { rRule } : {}),
    ...(categoryIds !== undefined ? { categoryIds } : {}),
    ...(scopedQuery !== undefined ? { scopedQuery } : {}),
  };
};
