/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDefaultRule } from './rules';

describe('isDefaultRule', () => {
  it('recognizes builtin rules', () => {
    expect(isDefaultRule({ is_builtin: true })).toBe(true);
    expect(isDefaultRule({ is_builtin: false })).toBe(false);
  });
});
