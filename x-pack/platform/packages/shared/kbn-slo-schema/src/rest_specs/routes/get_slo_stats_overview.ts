/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const getSLOStatsOverviewParamsSchema = t.partial({
  query: t.partial({
    kqlQuery: t.string,
    filters: t.string,
  }),
});

interface StatusStatsOverview {
  total: number;
  stale: number;
}

interface GetSLOStatsOverviewResponse {
  healthy: StatusStatsOverview;
  violated: StatusStatsOverview;
  degrading: StatusStatsOverview;
  noData: StatusStatsOverview;
  burnRateRules: number;
  burnRateActiveAlerts: number;
  burnRateRecoveredAlerts: number;
}

type GetSLOStatsOverviewParams = t.TypeOf<typeof getSLOStatsOverviewParamsSchema.props.query>;

export { getSLOStatsOverviewParamsSchema };
export type { GetSLOStatsOverviewParams, GetSLOStatsOverviewResponse };
