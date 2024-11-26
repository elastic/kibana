/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { esqlResultToPlainObjects } from './esql_result_to_plain_objects';

describe('esqlResultToPlainObjects', () => {
  it('should return an empty array for an empty result', () => {
    const result: ESQLSearchResponse = {
      columns: [],
      values: [],
    };
    const output = esqlResultToPlainObjects(result);
    expect(output).toEqual([]);
  });

  it('should return plain objects', () => {
    const result: ESQLSearchResponse = {
      columns: [{ name: 'name', type: 'keyword' }],
      values: [['Foo Bar']],
    };
    const output = esqlResultToPlainObjects(result);
    expect(output).toEqual([{ name: 'Foo Bar' }]);
  });

  it('should return columns without "text" or "keyword" in their names', () => {
    const result: ESQLSearchResponse = {
      columns: [
        { name: 'name.text', type: 'text' },
        { name: 'age', type: 'keyword' },
      ],
      values: [
        ['Foo Bar', 30],
        ['Foo Qux', 25],
      ],
    };
    const output = esqlResultToPlainObjects(result);
    expect(output).toEqual([
      { name: 'Foo Bar', age: 30 },
      { name: 'Foo Qux', age: 25 },
    ]);
  });

  it('should handle mixed columns correctly', () => {
    const result: ESQLSearchResponse = {
      columns: [
        { name: 'name', type: 'text' },
        { name: 'name.text', type: 'text' },
        { name: 'age', type: 'keyword' },
      ],
      values: [
        ['Foo Bar', 'Foo Bar', 30],
        ['Foo Qux', 'Foo Qux', 25],
      ],
    };
    const output = esqlResultToPlainObjects(result);
    expect(output).toEqual([
      { name: 'Foo Bar', age: 30 },
      { name: 'Foo Qux', age: 25 },
    ]);
  });
});
