/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';

export const fieldStatsEmbeddableStateSchema = schema.object(
  {
    ...serializedTitlesSchema.getPropSchemas(),
    ...serializedTimeRangeSchema.getPropSchemas(),
    data_view_id: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: 1000,
        meta: { description: 'The data view ID used for field statistics.' },
      })
    ),
    view_type: schema.oneOf(
      [schema.literal('dataview'), schema.literal('esql')],
      {
        defaultValue: 'dataview' as const,
        meta: { description: 'The type of data source: data view or ES|QL query.' },
      }
    ),
    query: schema.maybe(
      schema.object({
        esql: schema.string({
          minLength: 1,
          meta: { description: 'The ES|QL query string.' },
        }),
      })
    ),
    show_distributions: schema.boolean({
      defaultValue: false,
      meta: {
        description: 'Whether to show distribution charts in the field statistics table.',
      },
    }),
  },
  {
    meta: {
      id: 'field_stats_table',
      description: 'Field statistics table embeddable schema',
    },
  }
);

export type FieldStatsEmbeddableState = TypeOf<typeof fieldStatsEmbeddableStateSchema>;

export type FieldStatsViewType = FieldStatsEmbeddableState['view_type'];
