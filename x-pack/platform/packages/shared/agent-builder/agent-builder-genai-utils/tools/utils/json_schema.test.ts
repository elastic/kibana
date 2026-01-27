/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapJsonSchema } from './json_schema';

describe('wrapJsonSchema', () => {
  describe('when the schema is already an object', () => {
    it('does not wrap the schema', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          name: { type: 'string' },
        },
      };

      const result = wrapJsonSchema({ schema });

      expect(result.wrapped).toBe(false);
    });

    it('preserves the original schema description if present', () => {
      const schema = {
        type: 'object' as const,
        description: 'My custom description',
        properties: {
          name: { type: 'string' },
        },
      };

      const result = wrapJsonSchema({ schema });

      expect(result.schema).toEqual({
        type: 'object',
        description: 'My custom description',
        properties: {
          name: { type: 'string' },
        },
      });
    });

    it('uses the provided description if the schema has no description', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          name: { type: 'string' },
        },
      };

      const result = wrapJsonSchema({ schema, description: 'Provided description' });

      expect(result.schema).toEqual({
        type: 'object',
        description: 'Provided description',
        properties: {
          name: { type: 'string' },
        },
      });
    });

    it('uses the default description if none is provided', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          name: { type: 'string' },
        },
      };

      const result = wrapJsonSchema({ schema });

      expect(result.schema).toEqual({
        type: 'object',
        description: 'The response to provide',
        properties: {
          name: { type: 'string' },
        },
      });
    });
  });

  describe('when the schema is not an object', () => {
    it('wraps a string schema', () => {
      const schema = { type: 'string' as const };

      const result = wrapJsonSchema({ schema });

      expect(result.wrapped).toBe(true);
      expect(result.schema).toEqual({
        type: 'object',
        description: 'The response to provide',
        properties: {
          response: { type: 'string' },
        },
      });
    });

    it('wraps a number schema', () => {
      const schema = { type: 'number' as const };

      const result = wrapJsonSchema({ schema });

      expect(result.wrapped).toBe(true);
      expect(result.schema).toEqual({
        type: 'object',
        description: 'The response to provide',
        properties: {
          response: { type: 'number' },
        },
      });
    });

    it('wraps an array schema', () => {
      const schema = {
        type: 'array' as const,
        items: { type: 'string' },
      };

      const result = wrapJsonSchema({ schema });

      expect(result.wrapped).toBe(true);
      expect(result.schema).toEqual({
        type: 'object',
        description: 'The response to provide',
        properties: {
          response: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      });
    });

    it('wraps a boolean schema', () => {
      const schema = { type: 'boolean' as const };

      const result = wrapJsonSchema({ schema });

      expect(result.wrapped).toBe(true);
      expect(result.schema).toEqual({
        type: 'object',
        description: 'The response to provide',
        properties: {
          response: { type: 'boolean' },
        },
      });
    });

    it('uses a custom property name when provided', () => {
      const schema = { type: 'string' as const };

      const result = wrapJsonSchema({ schema, property: 'result' });

      expect(result.schema).toEqual({
        type: 'object',
        description: 'The response to provide',
        properties: {
          result: { type: 'string' },
        },
      });
    });

    it('uses a custom description when provided', () => {
      const schema = { type: 'string' as const };

      const result = wrapJsonSchema({ schema, description: 'Custom description' });

      expect(result.schema).toEqual({
        type: 'object',
        description: 'Custom description',
        properties: {
          response: { type: 'string' },
        },
      });
    });

    it('uses both custom property and description when provided', () => {
      const schema = { type: 'string' as const };

      const result = wrapJsonSchema({
        schema,
        property: 'answer',
        description: 'The answer to the question',
      });

      expect(result.schema).toEqual({
        type: 'object',
        description: 'The answer to the question',
        properties: {
          answer: { type: 'string' },
        },
      });
    });
  });
});
