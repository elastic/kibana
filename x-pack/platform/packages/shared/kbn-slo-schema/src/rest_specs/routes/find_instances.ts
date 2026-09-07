/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';

const findSLOInstancesParamsSchema = t.intersection([
  t.type({
    path: t.type({ id: t.string }),
  }),
  t.partial({
    query: t.partial({
      search: t.string,
      size: toNumberRt,
      searchAfter: t.string,
      remoteName: t.string,
    }),
  }),
]);

interface FindSLOInstancesResponse {
  results: Array<{ instanceId: string; groupings: Record<string, string | number> }>;
  searchAfter?: string;
}

interface FindSLOInstancesParams {
  sloId: string;
  spaceId: string;
  search?: string;
  size?: number;
  searchAfter?: string;
  remoteName?: string;
}

export { findSLOInstancesParamsSchema };
export type { FindSLOInstancesParams, FindSLOInstancesResponse };
