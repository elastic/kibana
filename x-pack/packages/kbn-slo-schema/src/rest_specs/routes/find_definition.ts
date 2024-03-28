/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { toBooleanRt } from '@kbn/io-ts-utils/src/to_boolean_rt';
import * as t from 'io-ts';
import { sloResponseSchema } from '../slo';

const findSloDefinitionsParamsSchema = t.partial({
  query: t.partial({
    search: t.string,
    includeOutdatedOnly: toBooleanRt,
    page: t.string,
    perPage: t.string,
  }),
});

const findSloDefinitionsResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(sloResponseSchema),
});

type FindSLODefinitionsParams = t.TypeOf<typeof findSloDefinitionsParamsSchema.props.query>;
type FindSLODefinitionsResponse = t.OutputOf<typeof findSloDefinitionsResponseSchema>;

export { findSloDefinitionsParamsSchema, findSloDefinitionsResponseSchema };
export type { FindSLODefinitionsParams, FindSLODefinitionsResponse };
