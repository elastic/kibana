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

const getSLOStatsOverviewResponseSchema = t.type({
  violated: t.number,
  degrading: t.number,
  stale: t.number,
  healthy: t.number,
  noData: t.number,
  burnRateRules: t.number,
  burnRateActiveAlerts: t.number,
  burnRateRecoveredAlerts: t.number,
});

type GetSLOStatsOverviewParams = t.TypeOf<typeof getSLOStatsOverviewParamsSchema.props.query>;
type GetSLOStatsOverviewResponse = t.OutputOf<typeof getSLOStatsOverviewResponseSchema>;

export { getSLOStatsOverviewParamsSchema, getSLOStatsOverviewResponseSchema };
export type { GetSLOStatsOverviewParams, GetSLOStatsOverviewResponse };
