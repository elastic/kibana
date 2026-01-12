/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isInProtectedNamespace } from './namespaces';

describe('isInProtectedNamespace', () => {
  it('returns true when the tool id is inside a protected namespace', () => {
    expect(isInProtectedNamespace('platform.core.some_tool')).toBe(true);
  });

  it('returns true when the tool id is nested in a protected namespace', () => {
    expect(isInProtectedNamespace('platform.core.nested.some_tool')).toBe(true);
  });

  it('returns false when the tool id is inside a part of a protected namespace', () => {
    expect(isInProtectedNamespace('platform.some_tool')).toBe(false);
  });
});
