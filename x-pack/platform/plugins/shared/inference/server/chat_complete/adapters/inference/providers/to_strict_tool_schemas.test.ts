/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { z } from '@kbn/zod/v4';
import type { ToolSchema } from '@kbn/inference-common';
import { toStrictToolSchemas } from './to_strict_tool_schemas';

// mirrors how tool schemas are converted before reaching the adapters,
// see `resolveToolSchema` in `@kbn/inference-langchain`
const toToolSchema = (zodSchema: z.ZodType): ToolSchema =>
  pick(z.toJSONSchema(zodSchema, { io: 'input' }), [
    'type',
    'properties',
    'required',
  ]) as ToolSchema;

const strictSchemaOf = (zodSchema: z.ZodType) =>
  toStrictToolSchemas({ myTool: { description: 'tool', schema: toToolSchema(zodSchema) } })
    .tools!.myTool.schema;

describe('toStrictToolSchemas', () => {
  it('should require every property and let optional ones be null', () => {
    expect(
      strictSchemaOf(
        z.object({
          migration_id: z.string(),
          is_prebuilt: z.boolean().optional().describe('prebuilt filter'),
          status: z.enum(['completed', 'failed']).optional(),
          ids: z.array(z.string().min(1)).optional(),
          page: z.number().int().min(0).default(0),
        })
      )
    ).toEqual({
      type: 'object',
      properties: {
        migration_id: { type: 'string' },
        is_prebuilt: {
          description: 'prebuilt filter',
          anyOf: [{ type: 'boolean' }, { type: 'null' }],
        },
        status: { anyOf: [{ type: 'string', enum: ['completed', 'failed'] }, { type: 'null' }] },
        ids: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] },
        page: {
          anyOf: [
            { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
            { type: 'null' },
          ],
        },
      },
      required: ['migration_id', 'is_prebuilt', 'status', 'ids', 'page'],
      additionalProperties: false,
    });
  });

  it('should apply the strict shape to nested objects', () => {
    expect(
      strictSchemaOf(
        z.object({ filter: z.object({ term: z.string().optional(), field: z.string() }) })
      )
    ).toEqual({
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          properties: {
            term: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            field: { type: 'string' },
          },
          required: ['term', 'field'],
          additionalProperties: false,
        },
      },
      required: ['filter'],
      additionalProperties: false,
    });
  });

  it('should not add a second null branch to an already nullable property', () => {
    expect(
      strictSchemaOf(z.object({ note: z.string().nullable().optional() }))!.properties
    ).toEqual({ note: { type: ['string', 'null'] } });
  });

  it('should leave a tool with a free-form object unchanged and not mark it strict', () => {
    const schema = toToolSchema(z.object({ data: z.record(z.string(), z.string()) }));

    const { tools, strictToolNames } = toStrictToolSchemas({
      withMap: { description: 'tool', schema },
      plain: { description: 'tool', schema: toToolSchema(z.object({ id: z.string() })) },
    });

    expect({ withMap: tools!.withMap.schema, strictToolNames }).toEqual({
      withMap: schema,
      strictToolNames: ['plain'],
    });
  });

  it('should give a tool without a schema an empty strict object schema', () => {
    expect(toStrictToolSchemas({ noArgs: { description: 'tool' } })).toEqual({
      tools: {
        noArgs: {
          description: 'tool',
          schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
        },
      },
      strictToolNames: ['noArgs'],
    });
  });
});
