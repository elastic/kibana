/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { z } from '@kbn/zod/v4';
import type { ToolSchema } from '@kbn/inference-common';
import { toolsToOpenAI } from './to_openai';

const toToolSchema = (zodSchema: z.ZodType): ToolSchema =>
  pick(z.toJSONSchema(zodSchema, { io: 'input' }), [
    'type',
    'properties',
    'required',
  ]) as ToolSchema;

describe('toolsToOpenAI (zod v4.6 JSON Schema)', () => {
  it('passes through zod-emitted schemas (OpenAI accepts JSON Schema type arrays and anyOf)', () => {
    const schema = toToolSchema(
      z.object({
        a: z.string().nullable(),
        b: z.union([z.string(), z.number()]),
      })
    );

    const [tool] = toolsToOpenAI({ myTool: { description: 'tool', schema } }) ?? [];

    expect(tool?.function?.parameters).toEqual({
      type: 'object',
      properties: {
        a: { type: ['string', 'null'] },
        b: { type: ['string', 'number'] },
      },
      required: ['a', 'b'],
    });
  });
});
