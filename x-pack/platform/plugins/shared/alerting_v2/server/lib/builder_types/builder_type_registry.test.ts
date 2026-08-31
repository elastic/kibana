/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { BuilderQueryGenerationError, defineBuilderType } from '@kbn/alerting-v2-rule-builders';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { BuilderTypeRegistry } from './builder_type_registry';
import type { GeneratedQuery, RegisteredBuilderType } from './types';

const aQuery: GeneratedQuery = {
  query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
};

const boundedFields = z.object({ indexPattern: z.string().max(256) }).strict();

const testType = (overrides: Partial<RegisteredBuilderType> = {}): RegisteredBuilderType => ({
  type: 'test_builder',
  builderFieldsSchema: boundedFields,
  generateQuery: () => aQuery,
  ...overrides,
});

/** Errors from the registry carry a Boom payload the routes turn into a 400. */
const boomOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error as { isBoom?: boolean; output?: { statusCode: number }; data?: unknown };
  }
  throw new Error('expected the call to throw');
};

describe('BuilderTypeRegistry', () => {
  let registry: BuilderTypeRegistry;

  beforeEach(() => {
    registry = new BuilderTypeRegistry();
  });

  describe('register', () => {
    it('registers and exposes a definition', () => {
      const definition = testType();
      registry.register(definition);

      expect(registry.has('test_builder')).toBe(true);
      expect(registry.get('test_builder')).toEqual(definition);
      expect(registry.getAll()).toHaveLength(1);
    });

    it('rejects a duplicate type', () => {
      registry.register(testType());

      expect(() => registry.register(testType())).toThrow(
        'Builder type "test_builder" is already registered'
      );
    });

    it('rejects an empty type', () => {
      expect(() => registry.register(testType({ type: '  ' }))).toThrow(
        'Builder type definition requires a non-empty type'
      );
    });

    it('rejects a missing schema', () => {
      expect(() =>
        registry.register(
          testType({ builderFieldsSchema: undefined as unknown as typeof boundedFields })
        )
      ).toThrow('requires a builderFieldsSchema');
    });

    it('rejects a missing generateQuery', () => {
      expect(() =>
        registry.register(
          testType({
            generateQuery: undefined as unknown as RegisteredBuilderType['generateQuery'],
          })
        )
      ).toThrow('requires a generateQuery function');
    });

    it('leaves the registry unchanged when registration fails', () => {
      expect(() => registry.register(testType({ type: '' }))).toThrow();

      expect(registry.getAll()).toHaveLength(0);
    });

    describe('bounded schema enforcement', () => {
      it('rejects an unbounded string', () => {
        expect(() =>
          registry.register(
            testType({ builderFieldsSchema: z.object({ name: z.string() }).strict() })
          )
        ).toThrow(/string is missing maxLength/);
      });

      it('rejects an unbounded array', () => {
        expect(() =>
          registry.register(
            testType({
              builderFieldsSchema: z.object({ fields: z.array(z.string().max(8)) }).strict(),
            })
          )
        ).toThrow(/array is missing maxItems/);
      });

      it('rejects a non-strict object', () => {
        expect(() =>
          registry.register(
            testType({ builderFieldsSchema: z.object({ name: z.string().max(8) }) })
          )
        ).toThrow(/object must be closed/);
      });

      it('rejects z.unknown()', () => {
        expect(() =>
          registry.register(
            testType({ builderFieldsSchema: z.object({ anything: z.unknown() }).strict() })
          )
        ).toThrow(/unconstrained/);
      });

      it('names builder_fields as the root path so the message points at the API field', () => {
        expect(() =>
          registry.register(
            testType({ builderFieldsSchema: z.object({ name: z.string() }).strict() })
          )
        ).toThrow(/Builder type "test_builder" builderFieldsSchema at builder_fields\.name/);
      });
    });
  });

  describe('generate', () => {
    beforeEach(() => {
      registry.register(testType());
    });

    it('returns the generated query for valid fields', () => {
      expect(registry.generate('test_builder', { indexPattern: 'logs-*' })).toEqual(aQuery);
    });

    it('passes the parsed fields to generateQuery', () => {
      const generateQuery = jest.fn().mockReturnValue(aQuery);
      registry.register(testType({ type: 'spy_builder', generateQuery }));

      registry.generate('spy_builder', { indexPattern: 'logs-*' });

      expect(generateQuery).toHaveBeenCalledWith({ indexPattern: 'logs-*' });
    });

    it('rejects an unregistered type with UNKNOWN_BUILDER_TYPE', () => {
      const error = boomOf(() => registry.generate('nope', {}));

      expect(error.output?.statusCode).toBe(400);
      expect(error.data).toEqual(
        expect.objectContaining({ code: ALERTING_ERROR_CODES.UNKNOWN_BUILDER_TYPE })
      );
    });

    it('lists the registered types when one is unknown', () => {
      const error = boomOf(() => registry.generate('nope', {})) as { data: { details: unknown } };

      expect(error.data.details).toEqual(
        expect.objectContaining({ builder_type: 'nope', registered: ['test_builder'] })
      );
    });

    it('rejects fields that fail the registered schema with INVALID_BUILDER_FIELDS', () => {
      const error = boomOf(() => registry.generate('test_builder', { indexPattern: 42 }));

      expect(error.output?.statusCode).toBe(400);
      expect(error.data).toEqual(
        expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS })
      );
    });

    it('rejects fields carrying properties the schema does not declare', () => {
      const error = boomOf(() =>
        registry.generate('test_builder', { indexPattern: 'logs-*', extra: true })
      );

      expect(error.data).toEqual(
        expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS })
      );
    });

    it('does not call generateQuery when the fields are invalid', () => {
      const generateQuery = jest.fn().mockReturnValue(aQuery);
      registry.register(testType({ type: 'strict_builder', generateQuery }));

      expect(() => registry.generate('strict_builder', { indexPattern: 42 })).toThrow();
      expect(generateQuery).not.toHaveBeenCalled();
    });

    it('maps a generation failure to BUILDER_QUERY_GENERATION_FAILED with its path', () => {
      registry.register(
        testType({
          type: 'failing_builder',
          generateQuery: () => {
            throw new BuilderQueryGenerationError('bad fragment', 'filterQuery');
          },
        })
      );

      const error = boomOf(() => registry.generate('failing_builder', { indexPattern: 'logs-*' }));

      expect(error.output?.statusCode).toBe(400);
      expect(error.data).toEqual(
        expect.objectContaining({
          code: ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED,
          details: { builder_type: 'failing_builder', path: 'filterQuery' },
        })
      );
    });

    it('lets an unexpected builder error surface as a 500 rather than a 400', () => {
      registry.register(
        testType({
          type: 'broken_builder',
          generateQuery: () => {
            throw new TypeError('cannot read properties of undefined');
          },
        })
      );

      expect(() => registry.generate('broken_builder', { indexPattern: 'logs-*' })).toThrow(
        TypeError
      );
    });
  });

  it('accepts a definition built through defineBuilderType', () => {
    interface Fields {
      indexPattern: string;
    }

    registry.register(
      defineBuilderType<Fields>({
        type: 'typed_builder',
        builderFieldsSchema: z.object({ indexPattern: z.string().max(64) }).strict(),
        generateQuery: (fields) => ({
          query: { format: 'standalone', breach: { query: `FROM ${fields.indexPattern}` } },
        }),
      })
    );

    expect(registry.generate('typed_builder', { indexPattern: 'logs-*' })).toEqual({
      query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
    });
  });
});
