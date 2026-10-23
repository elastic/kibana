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

  it('normalizes nullable boolean type arrays', () => {
    const schema = toToolSchema(z.object({ flag: z.boolean().nullable() }));

    const sanitized = sanitizeToolSchemasForVertex({
      myTool: { description: 'tool', schema },
    });

    expect(sanitized?.myTool.schema?.properties?.flag).toEqual({
      type: 'boolean',
      nullable: true,
    });
  });

  it('normalizes string|number unions into anyOf', () => {
    const schema = toToolSchema(z.object({ value: z.union([z.string(), z.number()]) }));

    const sanitized = sanitizeToolSchemasForVertex({
      myTool: { description: 'tool', schema },
    });

    expect(sanitized?.myTool.schema?.properties?.value).toEqual({
      anyOf: [{ type: 'string' }, { type: 'number' }],
    });
  });

  it('normalizes nullable types inside array items', () => {
    const schema = toToolSchema(z.object({ tags: z.array(z.string().nullable()) }));

    const sanitized = sanitizeToolSchemasForVertex({
      myTool: { description: 'tool', schema },
    });

    expect(sanitized?.myTool.schema?.properties?.tags).toEqual({
      type: 'array',
      items: {
        type: 'string',
        nullable: true,
      },
    });
  });

  it('inlines a root $ref from zod meta id before sanitizing', () => {
    const rawSchema = z.toJSONSchema(
      z
        .object({
          name: z.string(),
        })
        .meta({ id: 'NamedToolInput' }),
      { io: 'input' }
    ) as ToolSchema & { $ref?: string; $defs?: Record<string, unknown> };

    expect(rawSchema.$ref).toBeDefined();

    const sanitized = sanitizeToolSchemasForVertex({
      myTool: {
        description: 'tool',
        schema: pick(rawSchema, ['type', 'properties', 'required', '$ref', '$defs']) as ToolSchema,
      },
    });

    expect(sanitized?.myTool.schema).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    });
    expect(sanitized?.myTool.schema).not.toHaveProperty('$ref');
    expect(sanitized?.myTool.schema).not.toHaveProperty('$defs');
  });
});
