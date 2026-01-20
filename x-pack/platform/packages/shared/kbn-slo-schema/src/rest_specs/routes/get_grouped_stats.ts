/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const sloBaseParamsSchema = t.partial({
  size: t.number,
});

const apmSloParamsSchema = t.intersection([
  t.type({
    type: t.literal('apm'),
  }),
  t.partial({
    serviceNames: t.array(t.string),
    environment: t.string,
  }),
]);

const getSLOGroupedStatsParamsSchema = t.type({
  body: t.intersection([sloBaseParamsSchema, apmSloParamsSchema]),
});

const groupedStatsResultSchema = t.type({
  entity: t.string,
  summary: t.type({
    violated: t.number,
    degrading: t.number,
    healthy: t.number,
    noData: t.number,
  }),
});

const getSLOGroupedStatsResponseSchema = t.type({
  results: t.array(groupedStatsResultSchema),
});

type GroupedStatsResult = t.TypeOf<typeof groupedStatsResultSchema>;
type GetSLOGroupedStatsParams = t.TypeOf<typeof getSLOGroupedStatsParamsSchema>['body'];
type GetSLOGroupedStatsResponse = t.TypeOf<typeof getSLOGroupedStatsResponseSchema>;

export { getSLOGroupedStatsParamsSchema };

export type { GroupedStatsResult, GetSLOGroupedStatsParams, GetSLOGroupedStatsResponse };
