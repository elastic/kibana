/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { sloHealthResponseSchema } from '../../slo_health';

const findSLOHealthSortBySchema = t.literal('status');
const findSLOHealthSortDirectionSchema = t.union([t.literal('asc'), t.literal('desc')]);

const findSLOHealthParamsSchema = t.partial({
  query: t.partial({
    query: t.string,
    filters: t.string,
    sortBy: findSLOHealthSortBySchema,
    sortDirection: findSLOHealthSortDirectionSchema,
    searchAfter: t.string,
    page: t.string,
    size: t.string,
  }),
});

const findSLOHealthResponseSchema = t.type({
  searchAfter: t.union([t.string, t.undefined]),
  page: t.union([t.number, t.undefined]),
  size: t.number,
  total: t.number,
  results: t.array(sloHealthResponseSchema),
});

export type FindSLOHealthParams = t.TypeOf<typeof findSLOHealthParamsSchema.props.query>;
export type FindSLOHealthResponse = t.OutputOf<typeof findSLOHealthResponseSchema>;
export type FindSLOHealthSortBy = t.TypeOf<typeof findSLOHealthSortBySchema>;
export type FindSLOHealthSortDirection = t.TypeOf<typeof findSLOHealthSortDirectionSchema>;

export { findSLOHealthParamsSchema, findSLOHealthResponseSchema };
