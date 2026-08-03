/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { JsonSchemaType } from '@modelcontextprotocol/sdk/validation/types.js';
import { ZodJsonSchemaValidator } from './json_schema_validator';

describe('ZodJsonSchemaValidator', () => {
  let logger: MockedLogger;
  let validator: ZodJsonSchemaValidator;

  beforeEach(() => {
    logger = loggerMock.create();
    validator = new ZodJsonSchemaValidator(logger);
  });

  // The Jest preset disables code generation from strings, matching a hardened Kibana
  // instance (see `@kbn/test`'s `disallow_code_generation` setup). Building a validator is
  // therefore the assertion that matters here: the SDK's default ajv validator throws at
  // this point because it compiles schemas via `new Function`.
  it('builds a validator without generating code from strings', () => {
    expect(() =>
      validator.getValidator({
        type: 'object',
        properties: { count: { type: 'integer' } },
        required: ['count'],
      } as JsonSchemaType)
    ).not.toThrow();
  });

  it('accepts output matching the schema and returns the parsed data', () => {
    const validate = validator.getValidator<{ count: number }>({
      type: 'object',
      properties: { count: { type: 'integer' } },
      required: ['count'],
    } as JsonSchemaType);

    expect(validate({ count: 42 })).toEqual({
      valid: true,
      data: { count: 42 },
      errorMessage: undefined,
    });
  });

  it('rejects output that does not match the schema, with a readable message', () => {
    const validate = validator.getValidator({
      type: 'object',
      properties: { count: { type: 'integer' } },
      required: ['count'],
    } as JsonSchemaType);

    const result = validate({ count: 'not-a-number' });

    expect(result.valid).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errorMessage).toContain('count');
  });

  it('validates nested objects and arrays', () => {
    const validate = validator.getValidator({
      type: 'object',
      properties: {
        rows: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
        },
      },
    } as JsonSchemaType);

    expect(validate({ rows: [{ name: 'a' }] }).valid).toBe(true);
    expect(validate({ rows: [{ name: 1 }] }).valid).toBe(false);
  });

  it('accepts any value for `$ref` properties it cannot resolve, while still validating the rest', () => {
    // `$ref` pointers are not resolved by the converter, so that property degrades to
    // `unknown` rather than failing the whole schema.
    const validate = validator.getValidator({
      type: 'object',
      definitions: { Name: { type: 'string' } },
      properties: { name: { $ref: '#/definitions/Name' }, count: { type: 'integer' } },
      required: ['count'],
    } as JsonSchemaType);

    expect(validate({ name: 'a', count: 1 }).valid).toBe(true);
    expect(validate({ name: 1, count: 1 }).valid).toBe(true);
    // the sibling property is still enforced
    expect(validate({ name: 'a', count: 'nope' }).valid).toBe(false);
  });

  it('skips validation instead of throwing for schemas it cannot convert at all', () => {
    // An unparseable `pattern` makes the conversion fail outright. Throwing here would break
    // the whole tool listing, so it degrades to a permissive validator and logs instead.
    const validate = validator.getValidator({
      type: 'object',
      properties: { name: { type: 'string', pattern: '[' } },
    } as JsonSchemaType);

    expect(validate({ name: 'a' }).valid).toBe(true);
    expect(validate({ name: 1 }).valid).toBe(true);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Unable to convert MCP tool output schema to Zod')
    );
  });
});
