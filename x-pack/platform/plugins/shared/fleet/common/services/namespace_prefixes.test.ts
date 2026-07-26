/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNamespaceAllowedByPrefixes } from './namespace_prefixes';

describe('isNamespaceAllowedByPrefixes', () => {
  it('returns true when prefixes are null (no restriction)', () => {
    expect(isNamespaceAllowedByPrefixes('production', null)).toBe(true);
    expect(isNamespaceAllowedByPrefixes('', null)).toBe(true);
  });

  it('returns true when namespace starts with one of the allowed prefixes', () => {
    expect(isNamespaceAllowedByPrefixes('production_west', ['production', 'staging'])).toBe(true);
    expect(isNamespaceAllowedByPrefixes('staging', ['production', 'staging'])).toBe(true);
  });

  it('returns false when namespace does not match any allowed prefix', () => {
    expect(isNamespaceAllowedByPrefixes('dev', ['production', 'staging'])).toBe(false);
  });

  it('returns false when prefix list is empty', () => {
    // Empty array means restriction is in effect but nothing is allowed.
    expect(isNamespaceAllowedByPrefixes('anything', [])).toBe(false);
  });
});
