/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchQuery, HttpSetup } from '@kbn/core/public';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import { type ScheduledReportApiJSON } from '@kbn/reporting-common/types';

export interface Pagination {
  index: number;
  size: number;
}

export const getScheduledReportsList = async ({
  http,
  index,
  size,
}: {
  http: HttpSetup;
  index?: number;
  size?: number;
}): Promise<{
  page: number;
  size: number;
  total: number;
  data: ScheduledReportApiJSON[];
}> => {
  const query: HttpFetchQuery = { page: index, size };

  const res = await http.get<{
    page: number;
    per_page: number;
    total: number;
    data: ScheduledReportApiJSON[];
  }>(INTERNAL_ROUTES.SCHEDULED.LIST, {
    query,
  });

  return {
    page: res.page,
    size: res.per_page,
    total: res.total,
    data: res.data,
  };
};
