/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BooleanFromString } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';

import { MAX_KEYWORD_LENGTH, MAX_QUERY_LENGTH } from '../../schema/zod/limits';
import { transformHealthSchema } from '../../schema/zod/health';
import { sloDefinitionSchema } from '../../schema/zod/slo';

const findSloDefinitionsParamsSchema = z.object({
  query: z
    .object({
      search: z.string().max(MAX_KEYWORD_LENGTH).optional(),
      includeOutdatedOnly: BooleanFromString.optional(),
      includeHealth: BooleanFromString.optional(),
      tags: z.string().max(MAX_QUERY_LENGTH).optional(),
      page: z.string().optional(),
      perPage: z.string().optional(),
    })
    .optional(),
});

const healthMetadataSchema = z.object({
  health: z
    .object({
      isProblematic: z.boolean(),
      rollup: transformHealthSchema,
      summary: transformHealthSchema,
    })
    .optional(),
});

const sloDefinitionResponseSchema = sloDefinitionSchema.merge(healthMetadataSchema);

const findSloDefinitionsResponseSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
  results: z.array(sloDefinitionResponseSchema),
});

type FindSLODefinitionsParams = NonNullable<
  z.output<typeof findSloDefinitionsParamsSchema.shape.query>
>;
type FindSLODefinitionsResponse = z.input<typeof findSloDefinitionsResponseSchema>;

type SLODefinitionResponse = z.input<typeof sloDefinitionResponseSchema>;

export {
  findSloDefinitionsParamsSchema,
  findSloDefinitionsResponseSchema,
  sloDefinitionResponseSchema,
};
export type { FindSLODefinitionsParams, FindSLODefinitionsResponse, SLODefinitionResponse };
