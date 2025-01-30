/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const findSLOHealthParamsSchema = t.type({
  query: t.string,
  filter: t.string,
  sortBy: t.union([t.literal('status'), t.literal('id')]),
  sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
  searchAfter: t.string,
  size: t.string,
});

export type FindSLOHealthParams = t.TypeOf<typeof findSLOHealthParamsSchema>;
export { findSLOHealthParamsSchema };
