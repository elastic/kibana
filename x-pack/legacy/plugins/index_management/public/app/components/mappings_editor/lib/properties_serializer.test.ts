/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { serializeProperties, isObject } from './properties_serializer';

describe('Properties serializer', () => {
  it('should convert non object to empty object', () => {
    const tests = ['abc', 123, [], null, undefined];

    tests.forEach(testValue => {
      const { value, propertiesRemoved } = serializeProperties(testValue as any);
      expect(isObject(value)).toBe(true);
      expect(propertiesRemoved.length).toBe(0);
    });
  });

  it('should strip non object fields', () => {
    const properties = {
      prop1: { type: 'text' },
      prop2: 'abc', // To be removed
      prop3: 123, // To be removed
      prop4: null, // To be removed
      prop5: [], // To be removed
      prop6: {
        type: 'object',
        properties: {
          prop1: { type: 'text' },
          prop2: 'abc', // To be removed
        },
      },
    };
    const { value, propertiesRemoved } = serializeProperties(properties as any);

    expect(Object.keys(value)).toEqual(['prop1', 'prop6']);
    expect(propertiesRemoved).toEqual(['prop2', 'prop3', 'prop4', 'prop5', 'prop6.prop2']);
  });

  it(`should strip fields that dont't have a "type" defined`, () => {
    const properties = {
      prop1: { type: 'text' },
      prop2: {},
      prop3: {
        type: 'object',
        properties: {
          prop1: {},
          prop2: { type: 'keyword' },
        },
      },
    };
    const { value, propertiesRemoved } = serializeProperties(properties as any);

    expect(Object.keys(value)).toEqual(['prop1', 'prop3']);
    expect(propertiesRemoved).toEqual(['prop2', 'prop3.prop1']);
  });

  it('should strip field whose type is not a string or is unknown', () => {
    const properties = {
      prop1: { type: 123 },
      prop2: { type: 'clearlyUnknown' },
    };

    const { value, propertiesRemoved } = serializeProperties(properties as any);

    expect(Object.keys(value)).toEqual([]);
    expect(propertiesRemoved).toEqual(['prop1', 'prop2']);
  });

  it('should strip parameters that are unknown', () => {
    const properties = {
      prop1: { type: 'text', unknown: true, anotherUnknown: 123 },
      prop2: { type: 'keyword', store: true, index: true, doc_values_binary: true },
      prop3: {
        type: 'object',
        properties: {
          hello: { type: 'keyword', unknown: true, anotherUnknown: 123 },
        },
      },
    };

    const { value } = serializeProperties(properties as any);

    expect(value).toEqual({
      prop1: { type: 'text' },
      // All the below parameters are OK
      prop2: { type: 'keyword', store: true, index: true, doc_values_binary: true },
      prop3: {
        type: 'object',
        properties: {
          hello: { type: 'keyword' },
        },
      },
    });
  });

  it(`should strip parameters whose value don't validate the provided Joi schema`, () => {
    const properties = {
      prop1: { type: 'text', store: 'abc' },
    };

    const { value } = serializeProperties(properties as any);

    expect(value).toEqual({
      prop1: { type: 'text' },
    });
  });
});
