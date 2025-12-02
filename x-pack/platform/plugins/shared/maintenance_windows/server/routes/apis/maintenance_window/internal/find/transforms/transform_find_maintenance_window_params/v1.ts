/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindMaintenanceWindowsRequestQuery } from '../../../../../../schemas/maintenance_window/internal/request/find';
import type { FindMaintenanceWindowsParams } from '../../../../../../../application/methods/find/types';

export const transformFindMaintenanceWindowParams = (
  params: FindMaintenanceWindowsRequestQuery
): FindMaintenanceWindowsParams => {
  const status = params.status && !Array.isArray(params.status) ? [params.status] : params.status;

  return {
    ...(params.page ? { page: params.page } : {}),
    ...(params.per_page ? { perPage: params.per_page } : {}),
    ...(params.search ? { search: params.search } : {}),
    ...(params.status ? { status } : {}),
  };
};
