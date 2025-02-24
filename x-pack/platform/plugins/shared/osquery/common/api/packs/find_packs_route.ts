/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';

export const findPacksRequestQuerySchema = t.type({
  page: t.union([toNumberRt, t.undefined]),
  pageSize: t.union([toNumberRt, t.undefined]),
  sort: t.union([t.string, t.undefined]),
  sortOrder: t.union([t.union([t.literal('asc'), t.literal('desc')]), t.undefined]),
});

export type FindPacksRequestQuerySchema = t.OutputOf<typeof findPacksRequestQuerySchema>;
