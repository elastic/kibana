/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SOURCE_TYPES } from '../../../../../common';
import { BaseESAggSourceSchema } from './es_agg_source_schemas';

// TODO - replace querySchema with reusable querySchema
export const querySchema = schema.object({
  query: schema.oneOf([
    schema.string({
      meta: {
        description:
          'A text-based query such as Kibana Query Language (KQL) or Lucene query language.',
      },
    }),
    schema.recordOf(schema.string(), schema.any()),
  ]),
  language: schema.string({
    meta: { description: 'The query language such as KQL or Lucene.' },
  }),
});

export const ESJoinSourceSchema = BaseESAggSourceSchema.extends({
  type: schema.string(),
  whereQuery: schema.maybe(querySchema),
});

export const ESDistanceSourceSchema = ESJoinSourceSchema.extends(
  {
    distance: schema.number(),
    geoField: schema.string(),
    type: schema.literal(SOURCE_TYPES.ES_DISTANCE_SOURCE),
  },
  {
    unknowns: 'forbid',
  }
);

export const ESTermSourceSchema = ESJoinSourceSchema.extends(
  {
    size: schema.maybe(
      schema.number({
        min: 1,
      })
    ),
    term: schema.string(),
    type: schema.literal(SOURCE_TYPES.ES_TERM_SOURCE),
  },
  {
    unknowns: 'forbid',
  }
);

export const joinSourceSchema = schema.oneOf([
  schema.object(
    {
      id: schema.string(),
      type: schema.string(),
    },
    {
      unknowns: 'allow',
    }
  ),
  ESDistanceSourceSchema,
  ESTermSourceSchema,
]);
