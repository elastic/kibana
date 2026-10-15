/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { extractStructuredContent, wrapStructuredOutputSchema } from './extract_structured_content';

const objectSchema = {
  type: 'object',
  properties: { name: { type: 'string' }, count: { type: 'number' } },
  required: ['name', 'count'],
};

describe('wrapStructuredOutputSchema', () => {
  it('nests the schema under a required `response` property', () => {
    expect(wrapStructuredOutputSchema(objectSchema)).toEqual({
      type: 'object',
      properties: { response: objectSchema },
      required: ['response'],
    });
  });
});

describe('extractStructuredContent', () => {
  it('returns the wrapped value', () => {
    expect(
      extractStructuredContent({
        parsed: { response: { name: 'a', count: 1 } },
        schema: objectSchema,
      })
    ).toEqual({ name: 'a', count: 1 });
  });

  it('returns wrapped arrays and primitives', () => {
    expect(
      extractStructuredContent({
        parsed: { response: ['x', 'y'] },
        schema: { type: 'array', items: { type: 'string' } },
      })
    ).toEqual(['x', 'y']);
    expect(extractStructuredContent({ parsed: { response: 0 }, schema: { type: 'number' } })).toBe(
      0
    );
  });

  it('accepts unwrapped arguments that validate against the schema', () => {
    expect(
      extractStructuredContent({ parsed: { name: 'a', count: 1 }, schema: objectSchema })
    ).toEqual({ name: 'a', count: 1 });
  });

  it('accepts unwrapped arguments when the schema itself declares a `response` property', () => {
    const schema = {
      type: 'object',
      properties: { response: { type: 'string' } },
      required: ['response'],
    };
    expect(extractStructuredContent({ parsed: { response: 'hi' }, schema })).toEqual({
      response: 'hi',
    });
  });

  it('throws an ExecutionError naming the expected shape when neither shape matches', () => {
    let error: unknown;
    try {
      extractStructuredContent({
        parsed: { name: 1 },
        schema: objectSchema,
        responseMetadata: { model: 'm' },
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ExecutionError);
    const executionError = error as ExecutionError;
    expect(executionError.type).toBe('InvalidModelResponse');
    expect(executionError.message).toContain('"response"');
    expect(executionError.message).toContain('"schema"');
    expect(executionError.details).toEqual({
      receivedType: 'object',
      receivedKeys: ['name'],
      metadata: { model: 'm' },
    });
  });

  it('throws when the wrapped value does not validate and the arguments are not valid either', () => {
    expect(() =>
      extractStructuredContent({ parsed: { response: { name: 5 } }, schema: objectSchema })
    ).toThrow(ExecutionError);
  });

  it.each([
    [undefined],
    [null],
    [{}],
    [[]],
    ['text'],
    [{ response: undefined }],
    [{ response: null }],
  ])(
    'throws for empty or non-object arguments %j instead of returning undefined content',
    (parsed) => {
      expect(() =>
        extractStructuredContent({ parsed, schema: { type: 'object', properties: {} } })
      ).toThrow(ExecutionError);
    }
  );
});
