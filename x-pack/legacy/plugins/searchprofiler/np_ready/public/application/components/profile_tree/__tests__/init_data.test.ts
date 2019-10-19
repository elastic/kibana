/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Shard } from '../../../types';
import { initDataFor } from '../init_data';

import { searchResponse } from './fixtures/search_response';
import { processedSearchResponseNew } from './fixtures/processed_search_response';

describe('ProfileTree init data', () => {
  test('provides the expected result', () => {
    const input: Shard[] = searchResponse as any;
    const actual = initDataFor('searches')(input);
    expect(JSON.stringify(actual, null, 2)).toEqual(
      JSON.stringify(processedSearchResponseNew, null, 2)
    );
  });
});
