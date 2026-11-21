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

  describe('wrapped value that breaks the schema (lenient)', () => {
    const boundedSchema = {
      type: 'object',
      properties: {
        rationale: { type: 'string', maxLength: 5 },
        factors: { type: 'array', items: { type: 'string' }, maxItems: 1 },
      },
      required: ['rationale'],
    };
    const outOfBounds = { rationale: 'far too long', factors: ['a', 'b'] };

    it('returns the wrapped value and logs a warning naming the failing paths', () => {
      const logger = { warn: jest.fn() };
      expect(
        extractStructuredContent({
          parsed: { response: outOfBounds },
          schema: boundedSchema,
          logger,
        })
      ).toBe(outOfBounds);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      const message = logger.warn.mock.calls[0][0] as string;
      expect(message).toContain('rationale');
      expect(message).toContain('factors');
    });

    it('does not log when the wrapped value is valid', () => {
      const logger = { warn: jest.fn() };
      extractStructuredContent({
        parsed: { response: { rationale: 'ok' } },
        schema: boundedSchema,
        logger,
      });
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('returns a wrapped value of the wrong type (primitive for an object schema)', () => {
      const logger = { warn: jest.fn() };
      expect(
        extractStructuredContent({ parsed: { response: 5 }, schema: objectSchema, logger })
      ).toBe(5);
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('returns the whole arguments object when the schema declares `response` itself', () => {
      const logger = { warn: jest.fn() };
      const schema = {
        type: 'object',
        properties: {
          response: { type: 'string' },
          score: { type: 'number', maximum: 10 },
        },
        required: ['response', 'score'],
      };
      const parsed = { response: 'text', score: 11 };
      expect(extractStructuredContent({ parsed, schema, logger })).toEqual(parsed);
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('does not throw when no logger is given', () => {
      expect(
        extractStructuredContent({ parsed: { response: outOfBounds }, schema: boundedSchema })
      ).toBe(outOfBounds);
    });

    it('still throws for non-matching unwrapped arguments without a wrapped value', () => {
      expect(() =>
        extractStructuredContent({ parsed: { rationale: 'far too long' }, schema: boundedSchema })
      ).toThrow(ExecutionError);
    });
  });

  describe('unwrapped arguments carrying a `response` key the schema does not declare', () => {
    const permissive = { type: 'object' };

    it('treats a non-null `response` as the wrapped answer, not as unwrapped content', () => {
      expect(
        extractStructuredContent({ parsed: { response: 'hi', other: 1 }, schema: permissive })
      ).toBe('hi');
    });

    it('does so even when the wrapped value fails validation, with a warning', () => {
      const logger = { warn: jest.fn() };
      expect(
        extractStructuredContent({
          parsed: { response: 'hi', other: 1 },
          schema: { type: 'object', properties: { other: { type: 'number' } } },
          logger,
        })
      ).toBe('hi');
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('rejects a null `response` next to other keys when the schema does not declare it', () => {
      expect(() =>
        extractStructuredContent({ parsed: { response: null, other: 1 }, schema: permissive })
      ).toThrow(ExecutionError);
    });

    it('accepts permissive unwrapped arguments when `response` is absent', () => {
      expect(extractStructuredContent({ parsed: { other: 1 }, schema: permissive })).toEqual({
        other: 1,
      });
    });

    it('accepts unwrapped arguments that carry `response` when the schema declares it', () => {
      expect(
        extractStructuredContent({
          parsed: { response: 'hi', other: 1 },
          schema: { type: 'object', properties: { response: { type: 'string' } } },
        })
      ).toEqual({ response: 'hi', other: 1 });
    });
  });

  describe('converter coverage', () => {
    it('accepts date-time values with a UTC offset on the wrapped path', () => {
      const schema = {
        type: 'object',
        properties: { at: { type: 'string', format: 'date-time' } },
        required: ['at'],
      };
      const logger = { warn: jest.fn() };
      const value = { at: '2026-10-15T10:00:00+02:00' };
      expect(extractStructuredContent({ parsed: { response: value }, schema, logger })).toBe(value);
      // convertJsonSchemaToZod rejects offset date-times (shared code, not changed here), so the
      // wrapped value fails validation and takes the out-of-schema path, which logs exactly once.
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('pins the converter behaviour for date-time with an offset on the unwrapped path', () => {
      const schema = {
        type: 'object',
        properties: { at: { type: 'string', format: 'date-time' } },
        required: ['at'],
      };
      const run = () =>
        extractStructuredContent({ parsed: { at: '2026-10-15T10:00:00+02:00' }, schema });
      // Known convertJsonSchemaToZod limitation (shared code, not changed here): offset date-times are
      // rejected, so a model that drops the wrapper with such a value fails the step.
      expect(run).toThrow(ExecutionError);
    });

    it.each([
      ['an empty schema', {}],
      ['a root $ref', { $ref: '#/$defs/thing', $defs: { thing: { type: 'object' } } }],
    ])('accepts unwrapped junk for %s because the converter validates nothing', (_, schema) => {
      expect(extractStructuredContent({ parsed: { junk: true }, schema })).toEqual({ junk: true });
    });
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

  it('throws for a null `response` when the root schema admits null', () => {
    // Pinned on purpose: null means empty content here, so a null wrapper is never returned even
    // though the schema itself would admit null. Called out in the PR body.
    expect(() =>
      extractStructuredContent({
        parsed: { response: null },
        schema: { type: ['string', 'null'] },
      })
    ).toThrow(ExecutionError);
  });
});
