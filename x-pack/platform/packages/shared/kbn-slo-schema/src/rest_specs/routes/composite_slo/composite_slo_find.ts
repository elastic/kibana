/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { compositeSloDefinitionSchema } from '../../../schema/composite_slo';

const sortDirectionSchema = t.union([t.literal('asc'), t.literal('desc')]);
const sortBySchema = t.union([t.literal('name'), t.literal('createdAt'), t.literal('updatedAt')]);

const findCompositeSLOParamsSchema = t.partial({
  query: t.partial({
    search: t.string,
    page: t.string,
    perPage: t.string,
    sortBy: sortBySchema,
    sortDirection: sortDirectionSchema,
    tags: t.string,
    status: t.string,
  }),
});

const findCompositeSLOResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(compositeSloDefinitionSchema),
});

type FindCompositeSLOParams = t.TypeOf<typeof findCompositeSLOParamsSchema.props.query>;
type FindCompositeSLOResponse = t.OutputOf<typeof findCompositeSLOResponseSchema>;

export { findCompositeSLOParamsSchema, findCompositeSLOResponseSchema };
export type { FindCompositeSLOParams, FindCompositeSLOResponse };
