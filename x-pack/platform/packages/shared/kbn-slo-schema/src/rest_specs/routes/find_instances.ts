/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const findSLOInstancesParamsSchema = t.type({
  path: t.type({ id: t.string }),
  query: t.union([
    t.undefined,
    t.partial({
      search: t.string,
      size: t.string,
      searchAfter: t.string,
    }),
  ]),
});

interface FindSLOInstancesResponse {
  results: Array<{ instanceId: string }>;
  searchAfter?: string;
}

interface FindSLOInstancesParams {
  sloId: string;
  spaceId: string;
  search?: string;
  size?: number;
  searchAfter?: string;
}

export { findSLOInstancesParamsSchema };
export type { FindSLOInstancesParams, FindSLOInstancesResponse };
