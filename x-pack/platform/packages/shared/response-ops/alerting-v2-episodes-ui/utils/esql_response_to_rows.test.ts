/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { esqlResponseToObjectRows } from './esql_response_to_rows';

describe('esqlResponseToObjectRows', () => {
  it('maps columns and values into row objects', () => {
    const response: ESQLSearchResponse = {
      columns: [
        { name: 'a', type: 'integer' },
        { name: 'b', type: 'keyword' },
      ],
      values: [
        [1, 'x'],
        [2, 'y'],
      ],
    };

    expect(esqlResponseToObjectRows(response)).toEqual([
      { a: 1, b: 'x' },
      { a: 2, b: 'y' },
    ]);
  });

  it('returns an empty array when there are no rows', () => {
    const response: ESQLSearchResponse = {
      columns: [{ name: 'n', type: 'integer' }],
      values: [],
    };
    expect(esqlResponseToObjectRows(response)).toEqual([]);
  });
});
