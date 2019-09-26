/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEntries } from './get_entries';

describe('get_entries', () => {
  test('returns null if the entries is an empty object', () => {
    const [key, value] = getEntries({});
    expect(key).toEqual(null);
    expect(value).toEqual(null);
  });

  test('returns key value if the entries as a key value', () => {
    const [key, value] = getEntries({ 'host.name': 'some-host-value' });
    expect(key).toEqual('host.name');
    expect(value).toEqual('some-host-value');
  });
});
