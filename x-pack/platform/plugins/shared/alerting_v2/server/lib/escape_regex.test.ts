/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeRegex } from './escape_regex';

describe('escapeRegex', () => {
  it('leaves text without metacharacters untouched', () => {
    expect(escapeRegex('production')).toBe('production');
  });

  it('escapes every regex metacharacter', () => {
    expect(escapeRegex('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('escapes metacharacters embedded in a tag prefix', () => {
    expect(escapeRegex('team.sre')).toBe('team\\.sre');
    expect(escapeRegex('test[foo')).toBe('test\\[foo');
  });
});
