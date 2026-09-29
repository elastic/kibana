/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toDescribedDefinition, toDescribedSchema } from './describe_schema';

const mockBigDescription = 'x'.repeat(2_000);
const mockWidePropertyNames = Array.from({ length: 200 }, (_, index) => `property_${index}`);
const mockWideDefinition = () => ({
  type: 'object',
  properties: Object.fromEntries(mockWidePropertyNames.map((name) => [name, { type: 'string' }])),
});

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
    OversizedWide: mockWideDefinition(),
    OversizedWide2: mockWideDefinition(),
    OversizedWide3: mockWideDefinition(),
    OversizedWide4: mockWideDefinition(),
    OversizedWide5: mockWideDefinition(),
    OversizedWide6: mockWideDefinition(),
    OversizedLocalUnion: {
      description: mockBigDescription,
      oneOf: [{ $ref: '#/$defs/Duration' }, { type: 'string' }],
    },
    OversizedUnion: {
      description: mockBigDescription,
      oneOf: [
        { $ref: './_types.json#/$defs/Duration' },
        { $ref: './_types.json#/$defs/Wrapper' },
        { type: 'string' },
        { const: -1 },
        { enum: ['first', 'second'] },
      ],
    },
    OversizedHolder: {
      type: 'object',
      properties: { big: { $ref: './_types.json#/$defs/Oversized' } },
    },
  },
}));

describe('toDescribedSchema', () => {
  it('returns a schema without references or routing annotations unchanged', async () => {
    const schema = { type: 'object', properties: { size: { type: 'number' } } };

    await expect(toDescribedSchema('elasticsearch', schema)).resolves.toEqual({
      schema,
      expandableTypes: [],
    });
  });

  it('strips the routing annotation from every parameter', async () => {
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: {
        index: { type: 'string', 'x-found-in': 'path' },
        size: { type: 'number', 'x-found-in': 'query' },
        query: { type: 'object', 'x-found-in': 'body' },
      },
    });

    expect(schema).toEqual({
      type: 'object',
      properties: {
        index: { type: 'string' },
        size: { type: 'number' },
        query: { type: 'object' },
      },
    });
  });

  it('keeps the keys sitting alongside a reference', async () => {
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: {
        timeout: {
          $ref: './_types.json#/$defs/Duration',
          description: 'How long to wait for the node to respond.',
          'x-found-in': 'query',
        },
      },
    });

    expect(schema).toEqual(
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
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: {
        mappings: {
          $ref: './_types.json#/$defs/Oversized',
          description: 'Mapping definitions for the new index.',
        },
      },
    });

    expect(schema).toEqual({
      type: 'object',
      properties: {
        mappings: {
          type: 'object',
          title: 'Oversized',
          description: 'Mapping definitions for the new index.',
          'x-expandable': 'Oversized',
        },
      },
    });
  });

  it('inlines a referenced definition and points the reference at it', async () => {
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { timeout: { $ref: './_types.json#/$defs/Duration' } },
    });

    expect(schema).toEqual({
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
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { config: { $ref: './_types.json#/$defs/Wrapper' } },
    });

    expect(schema).toEqual(
      expect.objectContaining({
        $defs: expect.objectContaining({
          Wrapper: { type: 'object', properties: { every: { $ref: '#/$defs/Duration' } } },
          Duration: expect.objectContaining({ description: 'A duration such as "30s".' }),
        }),
      })
    );
  });

  it('describes a definition that is too large to inline instead of embedding it', async () => {
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { mappings: { $ref: './_types.json#/$defs/Oversized' } },
    });

    expect(schema).toEqual({
      type: 'object',
      properties: {
        mappings: {
          type: 'object',
          title: 'Oversized',
          description: mockBigDescription,
          'x-expandable': 'Oversized',
        },
      },
    });
  });

  it('names an oversized definition that carries no description of its own', async () => {
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { mappings: { $ref: './_types.json#/$defs/OversizedUndocumented' } },
    });

    expect(schema).toEqual({
      type: 'object',
      properties: {
        mappings: {
          type: 'object',
          title: 'OversizedUndocumented',
          'x-expandable': 'OversizedUndocumented',
          'x-properties': ['padding'],
        },
      },
    });
  });

  it('reports every stubbed definition as expandable', async () => {
    const { expandableTypes } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: {
        mappings: { $ref: './_types.json#/$defs/Oversized' },
        settings: { $ref: './_types.json#/$defs/OversizedUndocumented' },
        timeout: { $ref: './_types.json#/$defs/Duration' },
      },
    });

    expect(expandableTypes).toEqual(['Oversized', 'OversizedUndocumented']);
  });

  it('names the union members of an oversized union', async () => {
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { value: { $ref: './_types.json#/$defs/OversizedUnion' } },
    });

    const properties = schema.properties as Record<string, Record<string, unknown>>;
    expect(properties.value['x-one-of']).toEqual(['Duration', 'Wrapper', 'string', '-1', 'enum']);
    expect(properties.value['x-properties']).toBeUndefined();
  });

  it('truncates a child name list that would not fit its budget', async () => {
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { wide: { $ref: './_types.json#/$defs/OversizedWide' } },
    });

    const properties = schema.properties as Record<string, Record<string, unknown>>;
    const names = properties.wide['x-properties'] as string[];
    const omitted = properties.wide['x-omitted'] as number;

    expect(names.length).toBeGreaterThan(0);
    expect(omitted).toBeGreaterThan(0);
    expect(names.length + omitted).toBe(mockWidePropertyNames.length);
    expect(names).toEqual(mockWidePropertyNames.slice(0, names.length));
    expect(JSON.stringify(names).length).toBeLessThanOrEqual(2_000);
  });

  it('names a union member the shared file points at with a local pointer', async () => {
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { value: { $ref: './_types.json#/$defs/OversizedLocalUnion' } },
    });

    const properties = schema.properties as Record<string, Record<string, unknown>>;
    expect(properties.value['x-one-of']).toEqual(['Duration', 'string']);
  });

  it('keeps the child list key on a stub the shared budget left no room for', async () => {
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: {
        first: { $ref: './_types.json#/$defs/OversizedWide' },
        second: { $ref: './_types.json#/$defs/OversizedWide2' },
        third: { $ref: './_types.json#/$defs/OversizedWide3' },
        fourth: { $ref: './_types.json#/$defs/OversizedWide4' },
        fifth: { $ref: './_types.json#/$defs/OversizedWide5' },
        sixth: { $ref: './_types.json#/$defs/OversizedWide6' },
      },
    });

    const properties = schema.properties as Record<string, Record<string, unknown>>;
    expect(properties.first['x-properties']).not.toHaveLength(0);
    expect(properties.sixth).toEqual(
      expect.objectContaining({
        'x-expandable': 'OversizedWide6',
        'x-properties': [],
        'x-omitted': mockWidePropertyNames.length,
      })
    );
  });

  it('charges a definition stubbed twice for its child names only once', async () => {
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: {
        query: { $ref: './_types.json#/$defs/OversizedWide' },
        post_filter: { $ref: './_types.json#/$defs/OversizedWide' },
        second: { $ref: './_types.json#/$defs/OversizedWide2' },
        third: { $ref: './_types.json#/$defs/OversizedWide3' },
        fourth: { $ref: './_types.json#/$defs/OversizedWide4' },
      },
    });

    const properties = schema.properties as Record<string, Record<string, unknown>>;
    expect(properties.post_filter['x-properties']).toEqual(properties.query['x-properties']);
    expect(properties.fourth['x-properties']).toEqual(properties.query['x-properties']);
  });

  it('terminates on a self-referential definition', async () => {
    const { schema } = await toDescribedSchema('elasticsearch', {
      type: 'object',
      properties: { node: { $ref: './_types.json#/$defs/SelfReferential' } },
    });

    expect(schema).toEqual({
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

    await expect(toDescribedSchema('elasticsearch', schema)).resolves.toEqual({
      schema,
      expandableTypes: [],
    });
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

describe('toDescribedDefinition', () => {
  const apiSchema = {
    type: 'object',
    properties: {
      mappings: { $ref: './_types.json#/$defs/Oversized' },
    },
  };

  it('returns the definition as the root of the described document', async () => {
    const described = await toDescribedDefinition('elasticsearch', apiSchema, 'Oversized');

    expect(described).toEqual({
      schema: { type: 'object', description: mockBigDescription },
      expandableTypes: [],
    });
  });

  it('inlines the definitions the expanded type reaches', async () => {
    const described = await toDescribedDefinition('elasticsearch', apiSchema, 'Wrapper');

    expect(described).toEqual({
      schema: {
        type: 'object',
        properties: { every: { $ref: '#/$defs/Duration' } },
        $defs: {
          Duration: {
            oneOf: [{ type: 'string' }, { const: -1 }],
            description: 'A duration such as "30s".',
          },
        },
      },
      expandableTypes: [],
    });
  });

  it('points a reference back to the expanded type at the document root', async () => {
    const described = await toDescribedDefinition('elasticsearch', apiSchema, 'SelfReferential');

    expect(described).toEqual({
      schema: { type: 'object', properties: { child: { $ref: '#' } } },
      expandableTypes: [],
    });
  });

  it('stubs a definition the expanded type reaches that is itself too large', async () => {
    const described = await toDescribedDefinition('elasticsearch', apiSchema, 'OversizedHolder');

    expect(described).toEqual({
      schema: {
        type: 'object',
        properties: {
          big: {
            type: 'object',
            title: 'Oversized',
            description: mockBigDescription,
            'x-expandable': 'Oversized',
          },
        },
      },
      expandableTypes: ['Oversized'],
    });
  });

  it('returns nothing for a name the schema closure does not define', async () => {
    await expect(
      toDescribedDefinition('elasticsearch', apiSchema, 'NotThere')
    ).resolves.toBeUndefined();
  });

  it('reuses the definition it already described', async () => {
    const [first, second] = await Promise.all([
      toDescribedDefinition('elasticsearch', apiSchema, 'Wrapper'),
      toDescribedDefinition('elasticsearch', apiSchema, 'Wrapper'),
    ]);

    expect(second).toBe(first);
    expect(await toDescribedDefinition('elasticsearch', apiSchema, 'Wrapper')).toBe(first);
  });
});
