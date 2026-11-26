/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValidator } from './validate_params';

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

  describe('when body validation is skipped', () => {
    const schema = {
      type: 'object',
      properties: {
        index: { type: 'string', 'x-found-in': 'path' },
        timeout: { type: 'string', 'x-found-in': 'query' },
        mappings: {
          type: 'object',
          'x-found-in': 'body',
          properties: { dynamic: { type: 'boolean' } },
        },
      },
      required: ['index', 'mappings'],
    };

    it('accepts any value for a body param', async () => {
      const validate = await getValidator('elasticsearch', schema, { skipBodyValidation: true });

      expect(validate({ index: 'logs', mappings: { dynamic: 'not-a-boolean' } })).toEqual([]);
      expect(validate({ index: 'logs', mappings: 'not-an-object' })).toEqual([]);
    });

    it('still validates path and query params', async () => {
      const validate = await getValidator('elasticsearch', schema, { skipBodyValidation: true });

      const errors = validate({ index: 5, timeout: false, mappings: {} });

      expect(errors.map(({ path }) => path)).toEqual(
        expect.arrayContaining(['#/index', '#/timeout'])
      );
    });

    it('still reports a missing required body param', async () => {
      const validate = await getValidator('elasticsearch', schema, { skipBodyValidation: true });

      expect(validate({ index: 'logs' })).toEqual([
        expect.objectContaining({
          message: expect.stringContaining('required property "mappings"'),
        }),
      ]);
    });

    it('still names an unknown param', async () => {
      const validate = await getValidator('elasticsearch', schema, { skipBodyValidation: true });

      expect(validate({ index: 'logs', mappings: {}, mapping: {} })).toEqual([
        {
          path: '#/mapping',
          message: 'Unknown parameter "mapping". It is not accepted by this API.',
        },
      ]);
    });

    it('does not load the schemas that only body params reference', async () => {
      const validate = await getValidator(
        'elasticsearch',
        {
          type: 'object',
          properties: {
            mappings: { 'x-found-in': 'body', $ref: './does_not_exist.json#/$defs/x' },
          },
        },
        { skipBodyValidation: true }
      );

      expect(validate({ mappings: { any: 'value' } })).toEqual([]);
    });

    it('keeps validating the body of the same schema when the option is not set', async () => {
      const params = { index: 'logs', mappings: { dynamic: 'not-a-boolean' } };

      const skipping = await getValidator('elasticsearch', schema, { skipBodyValidation: true });
      const validating = await getValidator('elasticsearch', schema);

      expect(skipping(params)).toEqual([]);
      expect(validating(params)).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: '#/mappings/dynamic' })])
      );
    });
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
