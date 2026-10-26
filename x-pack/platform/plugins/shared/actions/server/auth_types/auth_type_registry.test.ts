/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { AuthTypeRegistry } from './auth_type_registry';
import type { NormalizedAuthType } from '@kbn/connector-specs';

const getAuthType = (overrides = {}): NormalizedAuthType => {
  return {
    id: 'my-auth-type',
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
      const myType = getAuthType({ foo: 'bar' });
      const authTypeRegistry = new AuthTypeRegistry();
      authTypeRegistry.register(myType);
      // @ts-expect-error
      myType.foo = 'baz';
      // @ts-expect-error
      expect(authTypeRegistry.get('my-auth-type').foo).toEqual('bar');
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
});
