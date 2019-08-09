/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseQueryValue } from './parse_query_value';

describe('parseQueryValue', () => {
  test('parseQueryValue should return an empty string if value null', () => {
    expect(parseQueryValue(null)).toEqual('');
  });

  test('parseQueryValue should return an empty string if value undefined', () => {
    expect(parseQueryValue(undefined)).toEqual('');
  });

  test('parseQueryValue should return a string if value is an object', () => {
    expect(parseQueryValue({ hello: 'world' })).toEqual('{"hello":"world"}');
  });

  test('parseQueryValue should return a number if value is a number', () => {
    expect(parseQueryValue(33)).toEqual(33);
  });

  test('parseQueryValue should return a string if value is a string', () => {
    expect(parseQueryValue('I am a string')).toEqual('I am a string');
  });
});
