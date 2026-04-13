/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { toolDefinitionToInference } from './tools';

describe('toolDefinitionToInference / resolveToolSchema', () => {
  it('flattens z.intersection (top-level allOf) into a single object schema for providers', () => {
    const defs = toolDefinitionToInference([
      {
        type: 'function',
        function: {
          name: 'intersected_tool',
          description: 'd',
          parameters: z.intersection(
            z.object({ _reasoning: z.string().optional() }),
            z.object({ foo: z.string() })
          ),
        },
      },
    ]);

    expect(defs.intersected_tool.schema).toEqual({
      type: 'object',
      properties: {
        _reasoning: { type: 'string' },
        foo: { type: 'string' },
      },
      required: ['foo'],
    });
  });

  it('flattens z.discriminatedUnion (top-level oneOf) into one object with merged discriminator', () => {
    const defs = toolDefinitionToInference([
      {
        type: 'function',
        function: {
          name: 'union_tool',
          description: 'd',
          parameters: z.discriminatedUnion('operation_id', [
            z.object({
              operation_id: z.literal('op-a'),
              body: z.record(z.string(), z.unknown()),
            }),
            z.object({
              operation_id: z.literal('op-b'),
              query: z.record(z.string(), z.unknown()),
            }),
          ]),
        },
      },
    ]);

    expect(defs.union_tool.schema).toMatchObject({
      type: 'object',
      required: ['operation_id'],
      properties: {
        operation_id: {
          type: 'string',
          enum: ['op-a', 'op-b'],
        },
        body: {
          type: 'object',
          additionalProperties: {},
        },
        query: {
          type: 'object',
          additionalProperties: {},
        },
      },
    });
    expect(defs.union_tool.schema?.type).toBe('object');
  });
});
