/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSchemaFromParams } from './create_schema';
import type { EsqlToolConfig } from '@kbn/agent-builder-common';

const TEST_VALUES = {
  name: 'John',
  status: 'active',
  age: 25,
  count: 10,
  score: 8.5,
  active: true,
  created: '2023-01-01T00:00:00.000Z',
  jane: 'Jane',
  janeAge: 30,
  bob: 'Bob',
  johnDoe: 'John Doe',
};

describe('createSchemaFromParams', () => {
  it('should create schema for string types', () => {
    const params: EsqlToolConfig['params'] = {
      name: { type: 'string', description: 'User name' },
      status: { type: 'string', description: 'User status' },
    };

    const schema = createSchemaFromParams(params);
    const result = schema.parse({ name: TEST_VALUES.name, status: TEST_VALUES.status });

    expect(result).toEqual({ name: TEST_VALUES.name, status: TEST_VALUES.status });
  });

  it('should create schema for number types', () => {
    const params: EsqlToolConfig['params'] = {
      count: { type: 'integer', description: 'Item count' },
      score: { type: 'float', description: 'User score' },
    };

    const schema = createSchemaFromParams(params);
    const result = schema.parse({
      count: TEST_VALUES.count,
      score: TEST_VALUES.score,
    });

    expect(result).toEqual({
      count: TEST_VALUES.count,
      score: TEST_VALUES.score,
    });
  });

  it('should create schema for boolean and date types', () => {
    const params: EsqlToolConfig['params'] = {
      active: { type: 'boolean', description: 'Is active' },
      created: { type: 'date', description: 'Creation date' },
    };

    const schema = createSchemaFromParams(params);
    const result = schema.parse({
      active: TEST_VALUES.active,
      created: TEST_VALUES.created,
    });

    expect(result).toEqual({
      active: TEST_VALUES.active,
      created: TEST_VALUES.created,
    });
  });

  it('should handle optional parameters with default values', () => {
    const params: EsqlToolConfig['params'] = {
      name: {
        type: 'string',
        description: 'User name',
        optional: true,
        defaultValue: TEST_VALUES.johnDoe,
      },
      age: {
        type: 'integer',
        description: 'User age',
        optional: true,
      },
    };

    const schema = createSchemaFromParams(params);
    // Test with all parameters provided
    const result1 = schema.parse({ name: TEST_VALUES.jane, age: TEST_VALUES.janeAge });
    expect(result1).toEqual({ name: TEST_VALUES.jane, age: TEST_VALUES.janeAge });

    // Test with default value applied
    const result2 = schema.parse({ age: TEST_VALUES.age });
    expect(result2).toEqual({ name: TEST_VALUES.johnDoe, age: TEST_VALUES.age });

    // Test with optional parameter omitted
    const result3 = schema.parse({ name: TEST_VALUES.bob });
    expect(result3).toEqual({ name: TEST_VALUES.bob, age: undefined });
  });

  it('should handle empty parameters', () => {
    const schema = createSchemaFromParams({});
    const result = schema.parse({});

    expect(result).toEqual({});
  });

  it('should validate required parameters', () => {
    const params: EsqlToolConfig['params'] = {
      name: { type: 'string', description: 'User name' },
      age: { type: 'integer', description: 'User age' },
    };

    const schema = createSchemaFromParams(params);

    // Should pass with all required parameters
    expect(() => schema.parse({ name: TEST_VALUES.name, age: TEST_VALUES.age })).not.toThrow();

    // Should fail with missing required parameter
    expect(() => schema.parse({ name: TEST_VALUES.name })).toThrow();
  });
});
