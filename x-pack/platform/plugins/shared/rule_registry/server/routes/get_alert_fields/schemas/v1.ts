/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const timeSeriesMetric = {
  GAUGE: 'gauge',
  COUNTER: 'counter',
  SUMMARY: 'summary',
  HISTOGRAM: 'histogram',
  POSITION: 'position',
} as const;

export const getAlertFieldsRequestSchema = schema.object({
  rule_type_ids: schema.maybe(
    schema.oneOf(
      [
        schema.arrayOf(
          schema.string({
            meta: {
              description: 'Array of rule type ids.',
            },
          })
        ),
        schema.string({
          meta: {
            description: 'Single rule type id.',
          },
        }),
      ],
      {
        defaultValue: [],
      }
    )
  ),
});

export const getAlertFieldsResponseSchema = schema.object({
  fields: schema.arrayOf(
    schema.object({
      aggregatable: schema.boolean(),
      name: schema.string(),
      readFromDocValues: schema.boolean(),
      searchable: schema.boolean(),
      type: schema.string(),
      esTypes: schema.arrayOf(schema.string()),
      subType: schema.maybe(
        schema.object({
          multi: schema.maybe(
            schema.object({
              parent: schema.string(),
            })
          ),
          nested: schema.maybe(
            schema.object({
              path: schema.string(),
            })
          ),
        })
      ),
      metadata_field: schema.maybe(schema.boolean()),
      fixedInterval: schema.maybe(schema.arrayOf(schema.string())),
      timeZone: schema.maybe(schema.arrayOf(schema.string())),
      timeSeriesMetric: schema.maybe(
        schema.oneOf([
          schema.literal(timeSeriesMetric.GAUGE),
          schema.literal(timeSeriesMetric.COUNTER),
          schema.literal(timeSeriesMetric.SUMMARY),
          schema.literal(timeSeriesMetric.HISTOGRAM),
          schema.literal(timeSeriesMetric.POSITION),
        ])
      ),
      timeSeriesDimension: schema.maybe(schema.boolean()),
      defaultFormatter: schema.maybe(schema.string()),
    })
  ),
});

export type GetAlertFieldsRequest = TypeOf<typeof getAlertFieldsRequestSchema>;
export type GetAlertFieldsResponse = TypeOf<typeof getAlertFieldsResponseSchema>;
