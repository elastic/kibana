/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyStringReplacements, flattenJsonStrings } from './flatten_json';

describe('flattenJsonStrings', () => {
  it('collects every non-empty string leaf keyed by its JSON Pointer path', () => {
    const input = {
      host: { name: 'web-prod-eu-04', ip: '10.42.7.19' },
      tags: ['prod', 'eu'],
      count: 3,
      active: true,
      note: null,
    };

    expect(flattenJsonStrings(input)).toEqual({
      '/host/name': 'web-prod-eu-04',
      '/host/ip': '10.42.7.19',
      '/tags/0': 'prod',
      '/tags/1': 'eu',
    });
  });

  it('omits empty strings and non-string leaves', () => {
    expect(flattenJsonStrings({ empty: '', num: 1, flag: false, missing: null })).toEqual({});
  });

  it('escapes JSON Pointer special characters in object keys', () => {
    const input = { 'a/b': 'value', 'c~d': 'other' };
    expect(flattenJsonStrings(input)).toEqual({
      '/a~1b': 'value',
      '/c~0d': 'other',
    });
  });
});

describe('applyStringReplacements', () => {
  it('substitutes only the string leaves whose pointer is present in the replacement map', () => {
    const input = {
      host: { name: 'web-prod-eu-04', ip: '10.42.7.19' },
      count: 3,
    };

    const result = applyStringReplacements(input, {
      '/host/name': 'HOST_NAME_abc123',
      '/host/ip': 'IP_def456',
    });

    expect(result).toEqual({
      host: { name: 'HOST_NAME_abc123', ip: 'IP_def456' },
      count: 3,
    });
  });

  it('leaves the input unchanged when no replacements match', () => {
    const input = { message: 'nothing to mask' };
    expect(applyStringReplacements(input, {})).toEqual(input);
  });

  it('does not mutate the original input', () => {
    const input = { message: 'secret@example.com' };
    const result = applyStringReplacements(input, { '/message': 'EMAIL_abc123' });

    expect(input.message).toBe('secret@example.com');
    expect(result.message).toBe('EMAIL_abc123');
  });

  it('round-trips through flattenJsonStrings pointers', () => {
    const input = { items: [{ user: 'a.mehta' }, { user: 'b.jones' }] };
    const flattened = flattenJsonStrings(input);

    const result = applyStringReplacements(input, {
      [Object.keys(flattened)[0]]: 'USER_NAME_1',
      [Object.keys(flattened)[1]]: 'USER_NAME_2',
    });

    expect(result).toEqual({ items: [{ user: 'USER_NAME_1' }, { user: 'USER_NAME_2' }] });
  });
});
