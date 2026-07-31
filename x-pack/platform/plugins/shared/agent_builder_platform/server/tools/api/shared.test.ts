/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnusableQueryParams, getValidator, toDescribedSchema } from './shared';

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

describe('api tool shared helpers', () => {
  describe('getValidator', () => {
    it('accepts params that satisfy the schema', async () => {
      const validate = await getValidator('elasticsearch', {
        type: 'object',
        properties: { size: { type: 'number' }, index: { type: 'string' } },
      });

      expect(validate({})).toEqual([]);
      expect(validate({ size: 5, index: 'my-index' })).toEqual([]);
    });

    it('reports the path and reason for a param of the wrong type', async () => {
      const validate = await getValidator('elasticsearch', {
        type: 'object',
        properties: { size: { type: 'number' } },
      });

      const errors = validate({ size: 'not-a-number' });

      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: '#/size',
            message: expect.stringContaining('Expected "number"'),
          }),
        ])
      );
    });

    it('reports a missing required param', async () => {
      const validate = await getValidator('elasticsearch', {
        type: 'object',
        properties: { index: { type: 'string' } },
        required: ['index'],
      });

      expect(validate({})).toEqual([
        expect.objectContaining({ message: expect.stringContaining('required property "index"') }),
      ]);
    });

    it('names an unknown param instead of letting it through to the querystring', async () => {
      const validate = await getValidator('elasticsearch', {
        type: 'object',
        properties: { size: { type: 'number' } },
      });

      expect(validate({ siz: 5 })).toEqual([
        { path: '#/siz', message: 'Unknown parameter "siz". It is not accepted by this API.' },
      ]);
    });

    it('does not mistake a known param for an unknown one when its value is invalid', async () => {
      const validate = await getValidator('elasticsearch', {
        type: 'object',
        properties: { size: { type: 'number' } },
      });

      const errors = validate({ size: 'not-a-number' });

      expect(errors.every((error) => !error.message.includes('Unknown parameter'))).toBe(true);
    });

    it('refuses a schema reference that escapes the schemas package', async () => {
      await expect(
        getValidator('elasticsearch', {
          type: 'object',
          properties: { bad: { $ref: '../../../etc/passwd.json#/$defs/x' } },
        })
      ).rejects.toThrow('Unsupported schema reference');
    });

    it('rejects a reference to a file that is not a JSON Schema document', async () => {
      await expect(
        getValidator('elasticsearch', {
          type: 'object',
          properties: { bad: { $ref: './does_not_exist.json#/$defs/x' } },
        })
      ).rejects.toThrow();
    });

    it('does not cache a failed build', async () => {
      const schema = {
        type: 'object',
        properties: { bad: { $ref: '../escape.json#/$defs/x' } },
      };

      await expect(getValidator('elasticsearch', schema)).rejects.toThrow();
      // A cached rejection would surface as an unhandled rejection rather than a fresh throw.
      await expect(getValidator('elasticsearch', schema)).rejects.toThrow();
    });
  });

  describe('getUnusableQueryParams', () => {
    it('accepts scalars, nullish values, and arrays of scalars', () => {
      expect(
        getUnusableQueryParams({
          index: 'my-index',
          size: 5,
          local: true,
          missing: undefined,
          empty: null,
          types: ['dashboard', 'lens'],
          mixed: [1, 'two', false],
        })
      ).toEqual([]);
    });

    it('names a param holding an object or an array containing one', () => {
      expect(
        getUnusableQueryParams({
          ok: 'value',
          range: { gte: 1 },
          nested: ['fine', { gte: 1 }],
          deep: [['too far']],
        })
      ).toEqual(['range', 'nested', 'deep']);
    });

    it('names a param whose array holds a nullish member', () => {
      expect(
        getUnusableQueryParams({
          empty: null,
          types: ['dashboard', null],
          fields: ['@timestamp', undefined],
        })
      ).toEqual(['types', 'fields']);
    });

    it('treats an absent querystring as having nothing to report', () => {
      expect(getUnusableQueryParams()).toEqual([]);
      expect(getUnusableQueryParams({})).toEqual([]);
    });
  });

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
});
