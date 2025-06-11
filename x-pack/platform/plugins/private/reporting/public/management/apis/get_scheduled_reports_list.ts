/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchQuery, HttpSetup } from '@kbn/core/public';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import { ScheduledReport } from '@kbn/reporting-common/types';
import { type ListScheduledReportApiJSON } from '../../../server/types';

export interface Pagination {
  index: number;
  size: number;
}

export const getScheduledReportsList = async ({
  http,
  page = 0,
}: {
  http: HttpSetup;
  page?: number;
  perPage?: number;
}): Promise<{
  page: number;
  perPage: number;
  total: number;
  data: ScheduledReport[];
}> => {
  const query: HttpFetchQuery = { page };

  const res = await http.get<{
    page: number;
    per_page: number;
    total: number;
    data: ListScheduledReportApiJSON[];
  }>(INTERNAL_ROUTES.SCHEDULED.LIST, {
    query,
  });

  const transformedData: ScheduledReport[] = res.data.map((item) => ({
    ...item,
    createdAt: item.created_at,
    createdBy: item.created_by,
    lastRun: item.last_run,
    nextRun: item.next_run,
    objectType: item.object_type,
  }));

  return {
    page: res.page,
    perPage: res.per_page,
    total: res.total,
    data: transformedData,
  };
};
