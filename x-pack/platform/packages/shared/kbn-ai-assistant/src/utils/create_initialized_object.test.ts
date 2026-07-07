/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInitializedObject } from './create_initialized_object';

describe('createInitializedObject', () => {
  it('should return an object with properties of type "string" set to a default value of ""', () => {
    expect(
      createInitializedObject({
        type: 'object',
        properties: {
          foo: {
            type: 'string',
          },
        },
        required: ['foo'],
      })
    ).toStrictEqual({ foo: '' });
  });

  it('should return an object with properties of type "number" set to a default value of 1', () => {
    expect(
      createInitializedObject({
        type: 'object',
        properties: {
          foo: {
            type: 'number',
          },
        },
        required: ['foo'],
      })
    ).toStrictEqual({ foo: 1 });
  });

  it('should return an object with properties of type "array" set to a default value of []', () => {
    expect(
      createInitializedObject({
        type: 'object',
        properties: {
          foo: {
            type: 'array',
          },
        },
        required: ['foo'],
      })
    ).toStrictEqual({ foo: [] });
  });

  it('should return an object with default values for properties that are required', () => {
    expect(
      createInitializedObject({
        type: 'object',
        properties: {
          requiredProperty: {
            type: 'string',
          },
          notRequiredProperty: {
            type: 'string',
          },
        },
        required: ['requiredProperty'],
      })
    ).toStrictEqual({ requiredProperty: '' });
  });

  it('should return an object with nested fields if they are present in the schema', () => {
    expect(
      createInitializedObject({
        type: 'object',
        properties: {
          foo: {
            type: 'object',
            properties: {
              bar: {
                type: 'object',
                properties: {
                  baz: {
                    type: 'string',
                  },
                },
                required: ['baz'],
              },
            },
            required: ['bar'],
          },
        },
      })
    ).toStrictEqual({ foo: { bar: { baz: '' } } });

    expect(
      createInitializedObject({
        type: 'object',
        properties: {
          foo: {
            type: 'object',
            properties: {
              bar: {
                type: 'string',
              },
            },
          },
        },
      })
    ).toStrictEqual({ foo: {} });
  });

  it('should handle a real life example', () => {
    expect(
      createInitializedObject({
        type: 'object',
        properties: {
          method: {
            type: 'string',
            description: 'The HTTP method of the Elasticsearch endpoint',
            enum: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'] as const,
          },
          path: {
            type: 'string',
            description: 'The path of the Elasticsearch endpoint, including query parameters',
          },
          notRequired: {
            type: 'string',
            description: 'This property is not required.',
          },
        },
        required: ['method', 'path'] as const,
      })
    ).toStrictEqual({ method: '', path: '' });
  });
});
