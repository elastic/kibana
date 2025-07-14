/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeUniqueFieldsByName } from './unique_fields';

describe('mergeUniqueFieldsByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('merges fields and removes duplicates', async () => {
    const siemFields = [
      { name: 'host.name', type: 'string' },
      { name: 'source.ip', type: 'ip' },
      { name: 'signal.enabled', type: 'boolean' },
    ];

    const otherFields = [
      { name: 'source.ip', type: 'ip' },
      { name: 'host.name', type: 'string' },
      { name: 'destination.port', type: 'number' },
    ];

    // @ts-expect-error: mocking only attributes
    const res = mergeUniqueFieldsByName(siemFields, otherFields);

    expect(res).toHaveLength(4);
    expect(res).toEqual([
      { name: 'host.name', type: 'string' },
      { name: 'source.ip', type: 'ip' },
      { name: 'signal.enabled', type: 'boolean' },
      { name: 'destination.port', type: 'number' },
    ]);
  });

  test('merges all fields when no duplicates', async () => {
    const siemFields = [
      { name: 'host.name', type: 'string' },
      { name: 'source.ip', type: 'ip' },
      { name: 'signal.enabled', type: 'boolean' },
    ];

    const otherFields = [
      { name: 'destination.port', type: 'number' },
      { name: 'user.name', type: 'string' },
    ];

    // @ts-expect-error: mocking only attributes
    const res = mergeUniqueFieldsByName(siemFields, otherFields);

    expect(res).toHaveLength(5);
    expect(res).toEqual([
      { name: 'host.name', type: 'string' },
      { name: 'source.ip', type: 'ip' },
      { name: 'signal.enabled', type: 'boolean' },
      { name: 'destination.port', type: 'number' },
      { name: 'user.name', type: 'string' },
    ]);
  });

  test('handles empty arrays', async () => {
    const res = mergeUniqueFieldsByName([], []);

    expect(res).toHaveLength(0);
    expect(res).toEqual([]);
  });

  test('returns empty array when no fields match', async () => {
    const res = mergeUniqueFieldsByName([], []);

    expect(res).toHaveLength(0);
    expect(res).toEqual([]);
  });
});
