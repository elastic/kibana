/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { AuthTypeRegistry } from './auth_type_registry';
import { registerAuthTypes } from './register_auth_types';
import zodToJsonSchema from 'zod-to-json-schema';
import type { NormalizedAuthType } from '@kbn/connector-specs';

const getAuthType = (overrides = {}): NormalizedAuthType => {
  return {
    id: 'my-auth-type',
    name: 'My test auth type',
    schema: z.object({
      apiKey: z.string().describe('API Key'),
    }),
    ...overrides,
  } as unknown as NormalizedAuthType;
};

describe('AuthTypeRegistry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('register()', () => {
    test('able to register auth types', () => {
      const authTypeRegistry = new AuthTypeRegistry();
      authTypeRegistry.register(getAuthType());
      expect(authTypeRegistry.has('my-auth-type')).toEqual(true);
    });

    test('shallow clones the given auth type', () => {
      const myType = getAuthType();
      const authTypeRegistry = new AuthTypeRegistry();
      authTypeRegistry.register(myType);
      myType.name = 'Changed';
      expect(authTypeRegistry.get('my-auth-type').name).toEqual('My test auth type');
    });

    test('throws error if auth type already registered', () => {
      const authTypeRegistry = new AuthTypeRegistry();
      authTypeRegistry.register(getAuthType());
      expect(() => authTypeRegistry.register(getAuthType())).toThrowErrorMatchingInlineSnapshot(
        `"Auth type \\"my-auth-type\\" is already registered."`
      );
    });

    test('throws error if auth type does not have an object schema', () => {
      const authTypeRegistry = new AuthTypeRegistry();
      expect(() =>
        authTypeRegistry.register(getAuthType({ schema: z.string() }))
      ).toThrowErrorMatchingInlineSnapshot(`"Auth type \\"my-auth-type\\" has an invalid schema."`);
    });
  });

  describe('get()', () => {
    test('returns auth type', () => {
      const authTypeRegistry = new AuthTypeRegistry();
      authTypeRegistry.register(getAuthType());
      const { schema, ...rest } = authTypeRegistry.get('my-auth-type');
      expect(schema).toBeDefined();
      expect(rest).toMatchInlineSnapshot(`
        Object {
          "id": "my-auth-type",
          "name": "My test auth type",
        }
      `);
    });

    test(`throws an error when auth type doesn't exist`, () => {
      const authTypeRegistry = new AuthTypeRegistry();
      expect(() => authTypeRegistry.get('no-auth-type')).toThrowErrorMatchingInlineSnapshot(
        `"Auth type \\"no-auth-type\\" is not registered."`
      );
    });
  });

  describe('has()', () => {
    test('returns false for unregistered auth types', () => {
      const authTypeRegistry = new AuthTypeRegistry();
      expect(authTypeRegistry.has('my-auth-type')).toEqual(false);
    });

    test('returns true after registering an auth type', () => {
      const authTypeRegistry = new AuthTypeRegistry();
      authTypeRegistry.register(getAuthType());
      expect(authTypeRegistry.has('my-auth-type')).toEqual(true);
    });
  });

  describe('getAllTypes()', () => {
    test('should return empty when nothing is registered', () => {
      const authTypeRegistry = new AuthTypeRegistry();
      const result = authTypeRegistry.getAllTypes();
      expect(result).toEqual([]);
    });

    test('should return list of registered type ids', () => {
      const authTypeRegistry = new AuthTypeRegistry();
      authTypeRegistry.register(getAuthType());
      authTypeRegistry.register(getAuthType({ id: 'another-auth-type' }));
      const result = authTypeRegistry.getAllTypes();
      expect(result).toEqual(['my-auth-type', 'another-auth-type']);
    });
  });

  describe('getSchemaForAuthType()', () => {
    const authTypeRegistry = new AuthTypeRegistry();
    registerAuthTypes(authTypeRegistry);

    test('correctly returns schema for auth type definition when only type ID is provided', () => {
      const schema = authTypeRegistry.getSchemaForAuthType('basic');
      expect(zodToJsonSchema(schema)).toMatchSnapshot();
    });

    ['override', 'merge'].forEach((mergeStrategy) => {
      describe(`"${mergeStrategy}" merge strategy"`, () => {
        test('correctly returns custom schema when there are overlapping keys', () => {
          const schema = authTypeRegistry.getSchemaForAuthType({
            type: 'header',
            mergeStrategy: mergeStrategy as 'override' | 'merge',
            customSchema: z.object({
              headers: z.object({
                'custom-api-key-field': z.string().describe('A custom field'),
              }),
            }),
          });
          expect(zodToJsonSchema(schema)).toMatchSnapshot();
        });

        test('correctly returns custom schema when there are no overlapping keys', () => {
          const schema = authTypeRegistry.getSchemaForAuthType({
            type: 'header',
            mergeStrategy: mergeStrategy as 'override' | 'merge',
            customSchema: z.object({
              additionalHeaders: z.object({
                'additional-custom-api-key-field': z.string().describe('A custom field'),
              }),
            }),
          });
          expect(zodToJsonSchema(schema)).toMatchSnapshot();
        });

        test('correctly returns custom schema when there are overlapping and non-overlapping keys', () => {
          const schema = authTypeRegistry.getSchemaForAuthType({
            type: 'basic',
            mergeStrategy: mergeStrategy as 'override' | 'merge',
            customSchema: z.object({
              password: z.string().min(5).describe('Password'),
              email: z.string().describe('Username'),
            }),
          });
          expect(zodToJsonSchema(schema)).toMatchSnapshot();
        });
      });
    });
  });
});
