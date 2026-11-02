/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BooleanFromString } from '@kbn/zod-helpers';
import { z, lazySchema } from '@kbn/zod';

import { sloHealthSchema } from '../../schema/health';
import { sloDefinitionSchema } from '../../schema/slo';

const findSloDefinitionsParamsSchema = lazySchema(() =>
  z.object({
    query: z
      .object({
        search: z.string().optional().describe('Filters the SLOs by name'),
        includeOutdatedOnly: BooleanFromString.optional().describe(
          'Indicates if the API returns only outdated SLO or all SLO definitions'
        ),
        includeHealth: BooleanFromString.optional().describe(
          'Indicates if the API returns SLO health data with definitions'
        ),
        tags: z.string().optional().describe('Filters the SLOs by tag'),
        page: z
          .string()
          .optional()
          .describe('The page to use for pagination, must be greater or equal than 1'),
        perPage: z.string().optional().describe('Number of SLOs returned by page'),
      })
      .optional(),
  })
);

const sloDefinitionResponseSchema = sloDefinitionSchema.extend({
  health: sloHealthSchema.optional(),
});

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
