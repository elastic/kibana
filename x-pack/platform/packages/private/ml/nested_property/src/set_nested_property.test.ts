/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setNestedProperty } from './set_nested_property';

describe('object_utils', () => {
  test('setNestedProperty()', () => {
    function getTestObj() {
      return {
        the: {
          nested: {
            value: 'the-nested-value',
          },
        },
      };
    }

    function getFalseyObject() {
      return {
        the: {
          nested: {
            value: false,
          },
          other_nested: {
            value: 0,
          },
        },
      };
    }

    const test1 = setNestedProperty(getTestObj(), 'the', 'update');
    expect(test1.the).toBe('update');

    const test2 = setNestedProperty(getTestObj(), 'the$', 'update');
    expect(test2.the$).toBe('update');

    const test3 = setNestedProperty(getTestObj(), 'the$', 'the-default-value');
    expect(test3.the$).toBe('the-default-value');

    const test4 = setNestedProperty(getTestObj(), 'the.neSted', 'update');
    expect(test4.the.neSted).toBe('update');

    const test5 = setNestedProperty(getTestObj(), 'the.nested', 'update');
    expect(test5.the.nested).toStrictEqual('update');

    const test6 = setNestedProperty(getTestObj(), 'the.nested.vaLue', 'update');
    expect(test6.the.nested.vaLue).toBe('update');

    const test7 = setNestedProperty(getTestObj(), 'the.nested.value', 'update');
    expect(test7.the.nested.value).toBe('update');

    const test8 = setNestedProperty(getTestObj(), 'the.nested.value.didntExist', 'update');
    expect(test8.the.nested.value.didntExist).toBe('update');

    const test9 = setNestedProperty(
      getTestObj(),
      'the.nested.value.didntExist',
      'the-default-value'
    );
    expect(test9.the.nested.value.didntExist).toBe('the-default-value');

    const test10 = setNestedProperty(getFalseyObject(), 'the.nested.value', 'update');
    expect(test10.the.nested.value).toBe('update');

    const test11 = setNestedProperty(getFalseyObject(), 'the.other_nested.value', 'update');
    expect(test11.the.other_nested.value).toBe('update');

    expect(() => {
      setNestedProperty(getTestObj(), 'the.__proto__', 'update');
    }).toThrow('Invalid accessor');
    expect(() => {
      setNestedProperty(getTestObj(), 'the.prototype', 'update');
    }).toThrow('Invalid accessor');
    expect(() => {
      setNestedProperty(getTestObj(), 'the.constructor', 'update');
    }).toThrow('Invalid accessor');
  });
});
