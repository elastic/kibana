/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';

const baseProps = {
  ...serializedTitlesSchema.shape,
  ...serializedTimeRangeSchema.shape,
  show_distributions: z.boolean().default(false).meta({
    description: 'Whether to show the distribution mini-charts in the table.',
  }),
};

const fieldStatsDataViewSchema = z
  .object({
    ...baseProps,
    view_type: z.literal('dataview'),
    data_view_id: z
      .string()
      .min(1)
      .max(1000)
      .meta({ description: 'Data view ID (stored as a panel reference).' }),
  })
  .strict();

const fieldStatsEsqlSchema = z
  .object({
    ...baseProps,
    view_type: z.literal('esql'),
    query: z
      .object({ esql: z.string().max(1000).meta({ description: 'The ES|QL query string.' }) })
      .strict()
      .meta({ description: 'ES|QL query.' }),
  })
  .strict();

export const fieldStatsTableEmbeddableSchema = z
  .discriminatedUnion('view_type', [fieldStatsDataViewSchema, fieldStatsEsqlSchema])
  .meta({
    id: 'data_visualizer_field_stats',
    description: 'Field statistics table embeddable schema',
  });

export type FieldStatsTableEmbeddableState = z.output<typeof fieldStatsTableEmbeddableSchema>;
