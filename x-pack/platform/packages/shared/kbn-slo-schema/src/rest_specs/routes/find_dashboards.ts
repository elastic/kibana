/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const findDashboardsParamsSchema = t.partial({
  query: t.partial({
    search: t.string,
    page: t.string,
  }),
});

const findDashboardsResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(t.type({ id: t.string, title: t.string })),
});

type FindDashboardsParams = t.TypeOf<typeof findDashboardsParamsSchema.props.query>;
type FindDashboardsResponse = t.OutputOf<typeof findDashboardsResponseSchema>;

export { findDashboardsParamsSchema, findDashboardsResponseSchema };
export type { FindDashboardsParams, FindDashboardsResponse };
