/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { groupSummarySchema } from '../../schema/common';

const groupBySchema = t.union([
  t.literal('ungrouped'),
  t.literal('slo.tags'),
  t.literal('status'),
  t.literal('slo.indicator.type'),
  t.literal('slo.instanceId'),
  t.literal('_index'),
  t.literal('slo.id'),
]);

const findSLOGroupsParamsSchema = t.partial({
  query: t.partial({
    page: t.string,
    perPage: t.string,
    groupBy: groupBySchema,
    groupsFilter: t.union([t.array(t.string), t.string]),
    kqlQuery: t.string,
    filters: t.string,
  }),
});

const sloGroupWithSummaryResponseSchema = t.type({
  group: t.string,
  groupBy: groupBySchema,
  summary: groupSummarySchema,
});

const findSLOGroupsResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(sloGroupWithSummaryResponseSchema),
});

type FindSLOGroupsParams = t.TypeOf<typeof findSLOGroupsParamsSchema.props.query>;
type FindSLOGroupsResponse = t.OutputOf<typeof findSLOGroupsResponseSchema>;

export {
  findSLOGroupsParamsSchema,
  findSLOGroupsResponseSchema,
  sloGroupWithSummaryResponseSchema,
};
export type { FindSLOGroupsParams, FindSLOGroupsResponse };
