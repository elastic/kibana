/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const getOverviewParamsSchema = t.partial({
  query: t.partial({
    kqlQuery: t.string,
    filters: t.string,
  }),
});

const getOverviewResponseSchema = t.type({
  violated: t.number,
  degrading: t.number,
  stale: t.number,
  healthy: t.number,
  worst: t.type({
    value: t.number,
    id: t.string,
  }),
  noData: t.number,
  burnRateRules: t.number,
  burnRateActiveAlerts: t.number,
  burnRateRecoveredAlerts: t.number,
});

type GetOverviewParams = t.TypeOf<typeof getOverviewParamsSchema.props.query>;
type GetOverviewResponse = t.OutputOf<typeof getOverviewResponseSchema>;

export { getOverviewParamsSchema, getOverviewResponseSchema };
export type { GetOverviewParams, GetOverviewResponse };
