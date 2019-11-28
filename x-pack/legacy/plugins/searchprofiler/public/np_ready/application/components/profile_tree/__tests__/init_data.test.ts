/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ShardSerialized } from '../../../types';
import { initDataFor } from '../init_data';

import { searchResponse } from './fixtures/search_response';
import { processedResponseWithFirstShard } from './fixtures/processed_search_response';

describe('ProfileTree init data', () => {
  test('provides the expected result', () => {
    const input: ShardSerialized[] = searchResponse as any;
    const actual = initDataFor('searches')(input);

    expect(actual[0].name).toEqual(processedResponseWithFirstShard[0].name);
    const expectedFirstShard = processedResponseWithFirstShard[0].shards[0];
    expect(actual[0].shards[0]).toEqual(expectedFirstShard);
  });
});
