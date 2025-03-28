/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { sloDefinitionSchema } from '../../schema';

const findSLOVersionsSchema = t.partial({
  version: t.union([t.literal('current'), t.literal('outdated')]),
});

const findSloDefinitionsParamsSchema = t.partial({
  query: t.intersection([
    findSLOVersionsSchema,
    t.partial({
      search: t.string,
      tags: t.string,
      page: t.string,
      perPage: t.string,
    }),
  ]),
});

const findSloDefinitionsResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(sloDefinitionSchema),
});

export type SLODefinitionVersions = t.TypeOf<typeof findSLOVersionsSchema.props.version>;
type FindSLODefinitionsParams = t.TypeOf<typeof findSloDefinitionsParamsSchema.props.query>;
type FindSLODefinitionsResponse = t.OutputOf<typeof findSloDefinitionsResponseSchema>;

export { findSloDefinitionsParamsSchema, findSloDefinitionsResponseSchema };
export type { FindSLODefinitionsParams, FindSLODefinitionsResponse };
