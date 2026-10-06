/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { z } from '@kbn/zod/v4';
import type { ToolSchema } from '@kbn/inference-common';
import { fixSchemaArrayProperties } from './convert_tools';

const toToolSchema = (zodSchema: z.ZodType): ToolSchema =>
  pick(z.toJSONSchema(zodSchema, { io: 'input' }), [
    'type',
    'properties',
    'required',
  ]) as ToolSchema;

describe('fixSchemaArrayProperties (zod v4.6 JSON Schema)', () => {
  it('normalizes nullable and union property types for Bedrock', () => {
    const schema = toToolSchema(
      z.object({
        a: z.string().nullable(),
        b: z.union([z.string(), z.number()]),
      })
    );

    expect(fixSchemaArrayProperties(schema)).toEqual({
      type: 'object',
      properties: {
        a: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        b: { anyOf: [{ type: 'string' }, { type: 'number' }] },
      },
      required: ['a', 'b'],
    });
  });
});
