/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toDescribedSchema } from './describe_schema';

const mockBigDescription = 'x'.repeat(2_000);

jest.mock('@elastic/schemas/es/json/_types.json', () => ({
  $defs: {
    Duration: {
      oneOf: [{ type: 'string' }, { const: -1 }],
      description: 'A duration such as "30s".',
    },
    Wrapper: {
      type: 'object',
      properties: { every: { $ref: './_types.json#/$defs/Duration' } },
    },
    SelfReferential: {
      type: 'object',
      properties: { child: { $ref: './_types.json#/$defs/SelfReferential' } },
    },
    Oversized: { type: 'object', description: mockBigDescription },
    OversizedUndocumented: {
      type: 'object',
      properties: { padding: { enum: [mockBigDescription] } },
    },
  },
}));

describe('toDescribedSchema', () => {
  it('returns a schema without references or routing annotations unchanged', async () => {
    const schema = { type: 'object', properties: { size: { type: 'number' } } };

    await expect(toDescribedSchema('elasticsearch', schema)).resolves.toEqual(schema);
  });

  it('strips the routing annotation from every parameter', async () => {
    const resolved = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: {
        index: { type: 'string', 'x-found-in': 'path' },
        size: { type: 'number', 'x-found-in': 'query' },
        query: { type: 'object', 'x-found-in': 'body' },
      },
    });

    expect(resolved).toEqual({
      type: 'object',
      properties: {
        index: { type: 'string' },
        size: { type: 'number' },
        query: { type: 'object' },
      },
    });
  });

  it('keeps the keys sitting alongside a reference', async () => {
    const resolved = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: {
        timeout: {
          $ref: './_types.json#/$defs/Duration',
          description: 'How long to wait for the node to respond.',
          'x-found-in': 'query',
        },
      },
    });

    expect(resolved).toEqual(
      expect.objectContaining({
        properties: {
          timeout: {
            $ref: '#/$defs/Duration',
            description: 'How long to wait for the node to respond.',
          },
        },
      })
    );
  });

  it("prefers a parameter's own description over the referenced type's", async () => {
    const resolved = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: {
        mappings: {
          $ref: './_types.json#/$defs/Oversized',
          description: 'Mapping definitions for the new index.',
        },
      },
    });

    expect(resolved).toEqual({
      type: 'object',
      properties: {
        mappings: {
          type: 'object',
          title: 'Oversized',
          description: 'Mapping definitions for the new index.',
        },
      },
    });
  });

  it('inlines a referenced definition and points the reference at it', async () => {
    const resolved = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { timeout: { $ref: './_types.json#/$defs/Duration' } },
    });

    expect(resolved).toEqual({
      type: 'object',
      properties: { timeout: { $ref: '#/$defs/Duration' } },
      $defs: {
        Duration: {
          oneOf: [{ type: 'string' }, { const: -1 }],
          description: 'A duration such as "30s".',
        },
      },
    });
  });

  it('inlines definitions reached through another definition', async () => {
    const resolved = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { config: { $ref: './_types.json#/$defs/Wrapper' } },
    });

    expect(resolved).toEqual(
      expect.objectContaining({
        $defs: expect.objectContaining({
          Wrapper: { type: 'object', properties: { every: { $ref: '#/$defs/Duration' } } },
          Duration: expect.objectContaining({ description: 'A duration such as "30s".' }),
        }),
      })
    );
  });

  it('describes a definition that is too large to inline instead of embedding it', async () => {
    const resolved = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { mappings: { $ref: './_types.json#/$defs/Oversized' } },
    });

    expect(resolved).toEqual({
      type: 'object',
      properties: {
        mappings: { type: 'object', title: 'Oversized', description: mockBigDescription },
      },
    });
  });

  it('names an oversized definition that carries no description of its own', async () => {
    const resolved = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { mappings: { $ref: './_types.json#/$defs/OversizedUndocumented' } },
    });

    expect(resolved).toEqual({
      type: 'object',
      properties: { mappings: { type: 'object', title: 'OversizedUndocumented' } },
    });
  });

  it('terminates on a self-referential definition', async () => {
    const resolved = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { node: { $ref: './_types.json#/$defs/SelfReferential' } },
    });

    expect(resolved).toEqual({
      type: 'object',
      properties: { node: { $ref: '#/$defs/SelfReferential' } },
      $defs: {
        SelfReferential: {
          type: 'object',
          properties: { child: { $ref: '#/$defs/SelfReferential' } },
        },
      },
    });
  });

  it('leaves a reference it cannot resolve untouched rather than dropping it', async () => {
    const schema = {
      type: 'object',
      properties: { unknown: { $ref: './_types.json#/$defs/NotThere' } },
    };

    await expect(toDescribedSchema('elasticsearch', schema)).resolves.toEqual(schema);
  });

  it('reuses the schema it already built for an input', async () => {
    const schema = {
      type: 'object',
      properties: { timeout: { $ref: './_types.json#/$defs/Duration' } },
    };

    const [first, second] = await Promise.all([
      toDescribedSchema('elasticsearch', schema),
      toDescribedSchema('elasticsearch', schema),
    ]);

    expect(second).toBe(first);
    expect(await toDescribedSchema('elasticsearch', schema)).toBe(first);
  });
});
