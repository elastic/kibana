/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { fetchAliases } from './fetch_aliases';

describe('fetching aliases', () => {
  const fetchFn = fetchAliases;

  test('should return map of aliases for indices', async () => {
    const retVal = [
      { index: 'test1Index', alias: 'test1Alias' },
      { index: 'test2Index', alias: 'test1Alias' },
      { index: 'test3Index', alias: 'test2Alias' },
      { index: 'test3Index', alias: 'test3Alias' },
    ];
    const mockCallWithRequest = sinon.spy(() => {
      return retVal;
    });

    const results = await fetchFn(mockCallWithRequest);

    expect(mockCallWithRequest.called);
    expect(results).toBeDefined();
    expect(results).toMatchObject({
      test1Index: ['test1Alias'],
      test2Index: ['test1Alias'],
      test3Index: ['test2Alias', 'test3Alias'],
    });
  });

  test('should return an empty object if no aliases exist', async () => {
    const mockCallWithRequest = sinon.spy(() => {
      return [];
    });

    const results = await fetchFn(mockCallWithRequest);

    expect(mockCallWithRequest.called);
    expect(results).toBeDefined();
    expect(results).toMatchObject({});
  });
});
