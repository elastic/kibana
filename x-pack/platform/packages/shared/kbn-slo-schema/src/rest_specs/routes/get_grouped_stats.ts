/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const apmBodyParamsSchema = t.intersection([
  t.type({
    /**
     * SLO type.
     */
    type: t.literal('apm'),
  }),
  t.partial({
    /**
     * Number of buckets to return.
     * If not provided, the query will use elasticsearch default value of 10.
     */
    size: t.number,
    /**
     * List of service names to filter by.
     */
    serviceNames: t.array(t.string),
    /**
     * Environment to filter by.
     */
    environment: t.string,
  }),
]);

const getSLOGroupedStatsParamsSchema = t.type({
  body: apmBodyParamsSchema,
});

interface GroupedStatsResult {
  entity: string;
  summary: { violated: number; degrading: number; healthy: number; noData: number };
}

interface GetSLOGroupedStatsResponse {
  results: Array<GroupedStatsResult>;
}

type GetSLOGroupedStatsParams = t.TypeOf<typeof getSLOGroupedStatsParamsSchema>['body'];

export { getSLOGroupedStatsParamsSchema };

export type { GroupedStatsResult, GetSLOGroupedStatsParams, GetSLOGroupedStatsResponse };
