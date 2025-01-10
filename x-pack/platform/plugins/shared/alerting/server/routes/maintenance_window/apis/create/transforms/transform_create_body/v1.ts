/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateMaintenanceWindowRequestBodyV1 } from '../../../../../../../common/routes/maintenance_window/apis/create';
import { CreateMaintenanceWindowParams } from '../../../../../../application/maintenance_window/methods/create/types';

export const transformCreateBody = (
  createBody: CreateMaintenanceWindowRequestBodyV1
): CreateMaintenanceWindowParams['data'] => {
  return {
    title: createBody.title,
    duration: createBody.duration,
    rRule: createBody.r_rule,
    categoryIds: createBody.category_ids,
    scopedQuery: createBody.scoped_query,
  };
};
