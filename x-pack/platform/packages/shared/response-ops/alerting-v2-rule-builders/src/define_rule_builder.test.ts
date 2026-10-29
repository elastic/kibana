/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { createParamsPatchSchema, defineRuleBuilder } from './define_rule_builder';

const lazyLimitSchema = lazySchema(() => z.number().int().min(1).default(10).describe('Max rows.'));

const paramsSchema = z
  .object({
    index: z.string().min(1).describe('Index to query.'),
    filter: z.string().optional().describe('Optional filter.'),
    fields: z.array(z.string()).default([]).describe('Fields to keep.'),
    limit: lazyLimitSchema,
    note: z.string().optional(),
  })
  .strict();

const patchSchema = createParamsPatchSchema(paramsSchema, 'Example');

const getProperties = () => {
  const jsonSchema = z.toJSONSchema(patchSchema);
  if (!('properties' in jsonSchema) || jsonSchema.properties === undefined) {
    throw new Error('Expected an object JSON schema');
  }
  return jsonSchema.properties;
};

describe('createParamsPatchSchema', () => {
  it('makes every field optional and applies no defaults', () => {
    expect(patchSchema.parse({})).toEqual({});
  });

  it('keeps each field’s validation', () => {
    expect(patchSchema.safeParse({ index: '' }).success).toBe(false);
    expect(patchSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(patchSchema.parse({ index: 'logs-*', limit: 5 })).toEqual({
      index: 'logs-*',
      limit: 5,
    });
  });

  it('accepts null only for optional fields', () => {
    expect(patchSchema.parse({ filter: null, note: null })).toEqual({ filter: null, note: null });
    expect(patchSchema.safeParse({ index: null }).success).toBe(false);
    expect(patchSchema.safeParse({ fields: null }).success).toBe(false);
    expect(patchSchema.safeParse({ limit: null }).success).toBe(false);
  });

  it('rejects fields the params schema does not have', () => {
    expect(patchSchema.safeParse({ query: 'FROM logs-*' }).success).toBe(false);
  });

  it('carries each field’s description and says how to remove optional fields', () => {
    expect(getProperties()).toMatchObject({
      index: { description: 'Index to query.' },
      filter: { description: 'Optional filter. Send `null` to remove it.' },
      fields: { description: 'Fields to keep.' },
      limit: { description: 'Max rows.' },
      note: { description: 'Send `null` to remove it.' },
    });
    expect(patchSchema.description).toContain('Changes to the Example params.');
  });
});

describe('defineRuleBuilder', () => {
  it('adds the patch schema derived from the params schema', () => {
    const builder = defineRuleBuilder({
      type: 'example',
      title: 'Example',
      summary: 'An example builder.',
      whenToUse: 'Never.',
      paramsSchema,
      examples: [],
      toFormState: (params) => params,
      fromFormState: (state) => state,
      validate: () => [],
      build: ({ index }) => ({ query: { base: `FROM ${index}` }, time_field: '@timestamp' }),
      parse: () => null,
    });

    expect(builder.paramsPatchSchema.parse({ fields: ['a'] })).toEqual({ fields: ['a'] });
    expect(builder.paramsPatchSchema.safeParse({ fields: null }).success).toBe(false);
  });
});
