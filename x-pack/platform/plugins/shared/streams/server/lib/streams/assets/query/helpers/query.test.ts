/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKqlAsCommandArg } from './query';

describe('getKqlAsCommandArg', () => {
  it('should escape double quotes', () => {
    const input = 'foo "bar" baz';
    const expected = 'foo \\"bar\\" baz';
    expect(getKqlAsCommandArg(input)).toBe(expected);
  });

  it('should not escape escaped double quotes', () => {
    const input = 'foo \\"bar\\" baz';
    const expected = 'foo \\"bar\\" baz';
    expect(getKqlAsCommandArg(input)).toBe(expected);
  });

  it('should handle empty strings', () => {
    const input = '';
    const expected = '';
    expect(getKqlAsCommandArg(input)).toBe(expected);
  });
});
