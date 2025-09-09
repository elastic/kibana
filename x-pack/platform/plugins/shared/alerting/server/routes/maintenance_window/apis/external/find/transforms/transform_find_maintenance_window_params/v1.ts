/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindMaintenanceWindowsQuery } from '../../../../../../../../common/routes/maintenance_window/external/apis/find';
import type { FindMaintenanceWindowsParams } from '../../../../../../../application/maintenance_window/methods/find/types';

export const transformFindMaintenanceWindowParams = (
  params: FindMaintenanceWindowsQuery
): FindMaintenanceWindowsParams => {
  const status = params.status && !Array.isArray(params.status) ? [params.status] : params.status;
  const searchFields: string[] = [];
  const search: string[] = [];

  if (params.title) {
    searchFields.push('title');
    search.push(params.title);
  }
  if (params.created_by) {
    searchFields.push('createdBy');
    search.push(params.created_by);
  }

  return {
    ...(params.page ? { page: params.page } : {}),
    ...(params.per_page ? { perPage: params.per_page } : {}),
    ...(params.status ? { status } : {}),
    ...(search.length ? { search: search.join(' ') } : {}),
    ...(searchFields.length ? { searchFields } : {}),
  };
};
