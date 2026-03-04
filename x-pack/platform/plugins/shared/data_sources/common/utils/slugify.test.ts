/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slugify } from './slugify';

describe('slugify', () => {
  it('preserves underscores in the name', () => {
    expect(slugify('SPO_connect')).toBe('spo_connect');
  });

  it('converts uppercase to lowercase', () => {
    expect(slugify('MySource')).toBe('mysource');
  });

  it('normalizes accented characters', () => {
    expect(slugify('caf\u00e9')).toBe('cafe');
    expect(slugify('re\u0301sume\u0301')).toBe('resume');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('My Data Source')).toBe('my-data-source');
  });

  it('collapses consecutive non-alphanumeric, non-underscore characters into a single hyphen', () => {
    expect(slugify('a--b  c')).toBe('a-b-c');
    expect(slugify('test!!!value')).toBe('test-value');
  });

  it('trims mixed leading and trailing hyphens and underscores', () => {
    expect(slugify('-_-test_-_')).toBe('test');
  });

  it('returns empty string when input contains only special characters', () => {
    expect(slugify('---')).toBe('');
    expect(slugify('!!!')).toBe('');
  });
});
