/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isJsonString } from './is_json_string';

describe('isJsonString', () => {
  it('should return false for non-string input', () => {
    expect(isJsonString(true)).toBe(false);
    expect(isJsonString(false)).toBe(false);
    expect(isJsonString(undefined)).toBe(false);
    expect(isJsonString(null)).toBe(false);
    expect(isJsonString(0)).toBe(false);
    expect(isJsonString({})).toBe(false);
  });

  it('should return whether string is parsable as valid json', () => {
    expect(
      isJsonString(`{
        "must": [],
        "must_not": [],
        "should": []
      }`)
    ).toBe(true);
    expect(
      isJsonString(`{
        "must":,
      }`)
    ).toBe(false);
  });
});
