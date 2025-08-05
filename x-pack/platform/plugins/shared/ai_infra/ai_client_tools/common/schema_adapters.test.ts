/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { z } from '@kbn/zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  convertSchemaToObservabilityParameters,
  convertParametersToSchema,
} from './schema_adapters';

const chartTypes = ['bar', 'line', 'area', 'pie', 'gauge', 'heatmap', 'mosaic', 'regionmap', 'table', 'tagcloud', 'treemap'];

const schema = z.object({
  esql: z.object({
    query: z
      .string()
      .describe(
        'The ES|QL query for this visualization. Use the "query" function to generate ES|QL first and then add it here.'
      ),
  }),
  type: z.enum(chartTypes as unknown as [string, ...string[]]).describe('The type of chart'),
  layers: z
    .object({
      xy: z
        .object({
          xAxis: z.string(),
          yAxis: z.string(),
          type: z.enum(['line', 'bar', 'area']),
        })
        .optional(),
      donut: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      metric: z.object({}).optional(),
      gauge: z.object({}).optional(),
      pie: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      heatmap: z
        .object({
          xAxis: z.string(),
          breakdown: z.string(),
        })
        .optional(),
      mosaic: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      regionmap: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      table: z.object({}).optional(),
      tagcloud: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      treemap: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
    })
    .optional(),
  title: z.string().describe('An optional title for the visualization.').optional(),
});
const parameters = {
  type: 'object',
  properties: {
    esql: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'The ES|QL query for this visualization. Use the "query" function to generate ES|QL first and then add it here.',
        },
      },
      required: ['query'],
    },
    type: {
      type: 'string',
      description: 'The type of chart',
      enum: chartTypes,
    },
    layers: {
      type: 'object',
      properties: {
        xy: {
          type: 'object',
          properties: {
            xAxis: {
              type: 'string',
            },
            yAxis: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['line', 'bar', 'area'],
            },
          },
        },
        donut: {
          type: 'object',
          properties: {
            breakdown: {
              type: 'string',
            },
          },
        },
        metric: {
          type: 'object',
        },
        gauge: {
          type: 'object',
        },
        pie: {
          type: 'object',
          properties: {
            breakdown: {
              type: 'string',
            },
          },
        },
        heatmap: {
          type: 'object',
          properties: {
            xAxis: {
              type: 'string',
            },
            breakdown: {
              type: 'string',
            },
          },
          required: ['xAxis'],
        },
        mosaic: {
          type: 'object',
          properties: {
            breakdown: {
              type: 'string',
            },
          },
          required: ['breakdown'],
        },
        regionmap: {
          type: 'object',
          properties: {
            breakdown: {
              type: 'string',
            },
          },
          required: ['breakdown'],
        },
        table: {
          type: 'object',
        },
        tagcloud: {
          type: 'object',
          properties: {
            breakdown: {
              type: 'string',
            },
          },
          required: ['breakdown'],
        },
        treemap: {
          type: 'object',
          properties: {
            breakdown: {
              type: 'string',
            },
          },
        },
      },
    },
    title: {
      type: 'string',
      description: 'An optional title for the visualization.',
    },
  },
  required: ['esql', 'type'],
} as const;
describe('convertSchemaToObservabilityParameters', () => {
  it('should convert a zod schema to a parameters object', () => {
    const converted = convertSchemaToObservabilityParameters(schema);
    expect(converted).toEqual(parameters);
  });
  it('should convert a parameters object to a zod schema', () => {
    const converted = convertParametersToSchema(parameters);
    expect(converted).toBeInstanceOf(z.ZodObject);
    const serialized = zodToJsonSchema(converted);
    const serializedOriginal = zodToJsonSchema(schema);
    expect(serialized).toEqual(serializedOriginal);
  })
});
