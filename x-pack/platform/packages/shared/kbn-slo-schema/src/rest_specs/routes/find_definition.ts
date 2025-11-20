/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { toBooleanRt } from '@kbn/io-ts-utils/src/to_boolean_rt';
import * as t from 'io-ts';
import {
  healthStatusSchema,
  sloDefinitionSchema,
  stateSchema,
  transformHealthSchema,
} from '../../schema';

const findSloDefinitionsParamsSchema = t.partial({
  query: t.partial({
    search: t.string,
    includeOutdatedOnly: toBooleanRt,
    includeHealth: toBooleanRt,
    tags: t.string,
    page: t.string,
    perPage: t.string,
  }),
});

const healthMetadataSchema = t.partial({
  state: stateSchema,
  health: t.type({
    overall: transformHealthSchema,
    rollup: healthStatusSchema,
    summary: healthStatusSchema,
  }),
});

const findSloDefinitionsResultSchema = t.intersection([sloDefinitionSchema, healthMetadataSchema]);

const findSloDefinitionsResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(findSloDefinitionsResultSchema),
});

type FindSLODefinitionsParams = t.TypeOf<typeof findSloDefinitionsParamsSchema.props.query>;
type FindSLODefinitionsResponse = t.OutputOf<typeof findSloDefinitionsResponseSchema>;

export { findSloDefinitionsParamsSchema, findSloDefinitionsResponseSchema };
export type { FindSLODefinitionsParams, FindSLODefinitionsResponse };
