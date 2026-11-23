/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { z } from '@kbn/zod/v4';
import type { ToolSchema } from '@kbn/inference-common';
import { sanitizeToolSchemasForVertex } from './sanitize_tool_schemas_for_vertex';

// mirrors how tool schemas are converted before reaching the adapters,
// see `resolveToolSchema` in `@kbn/inference-langchain`
const toToolSchema = (zodSchema: z.ZodType): ToolSchema =>
  pick(z.toJSONSchema(zodSchema, { io: 'input' }), [
    'type',
    'properties',
    'required',
  ]) as ToolSchema;

describe('sanitizeToolSchemasForVertex', () => {
  it('rebuilds tool schemas keeping only the fields Vertex AI accepts', () => {
    const schema = toToolSchema(
      z.object({
        size: z.number().positive().lt(100).optional(),
        mode: z.literal('fast'),
        filter: z.union([z.string(), z.array(z.string())]).optional(),
        note: z.string().nullable(),
        data: z.record(z.string(), z.string()),
        // discriminated unions emit `oneOf` with `const` discriminators inside
        operations: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('add'), config: z.record(z.string(), z.string()) }),
            z.object({ type: z.literal('remove') }),
          ])
        ),
      })
    );
    // zod v4 emits keywords rejected by Vertex: `propertyNames` for records,
    // `exclusiveMinimum`/`exclusiveMaximum` for number bounds and `const` for literals
    expect(JSON.stringify(schema)).toContain('propertyNames');
    expect(JSON.stringify(schema)).toContain('exclusiveMinimum');
    expect(JSON.stringify(schema)).toContain('exclusiveMaximum');
    expect(JSON.stringify(schema)).toContain('const');

    const sanitized = sanitizeToolSchemasForVertex({
      myTool: {
        description: 'some cool tool',
        schema,
      },
    });

    expect(sanitized).toEqual({
      myTool: {
        description: 'some cool tool',
        schema: {
          type: 'object',
          properties: {
            size: {
              type: 'number',
            },
            mode: {
              type: 'string',
              enum: ['fast'],
            },
            filter: {
              anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
            },
            note: {
              type: 'string',
              nullable: true,
            },
            data: {
              type: 'object',
              additionalProperties: { type: 'string' },
            },
            operations: {
              type: 'array',
              items: {
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['add'] },
                      config: {
                        type: 'object',
                        additionalProperties: { type: 'string' },
                      },
                    },
                    required: ['type', 'config'],
                  },
                  {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['remove'] },
                    },
                    required: ['type'],
                  },
                ],
              },
            },
          },
          required: ['mode', 'note', 'data', 'operations'],
        },
      },
    });
  });
});
