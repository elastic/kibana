/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAnonymizationMaskingEnabled } from './is_masking_enabled';
import type { AnonymizationRule } from './types';

const rule = (enabled: boolean): AnonymizationRule => ({
  type: 'RegExp',
  enabled,
  entityClass: 'EMAIL',
  pattern: 'a',
});

describe('isAnonymizationMaskingEnabled', () => {
  it('follows an explicit master switch regardless of rule state', () => {
    expect(isAnonymizationMaskingEnabled({ maskingEnabled: false, rules: [rule(true)] })).toBe(
      false
    );
    expect(isAnonymizationMaskingEnabled({ maskingEnabled: true, rules: [rule(false)] })).toBe(
      true
    );
  });

  it('keeps pre-master-switch settings masking when a rule is enabled', () => {
    expect(isAnonymizationMaskingEnabled({ rules: [rule(false), rule(true)] })).toBe(true);
  });

  it('keeps pre-master-switch settings off when no rule is enabled', () => {
    expect(isAnonymizationMaskingEnabled({ rules: [rule(false)] })).toBe(false);
    expect(isAnonymizationMaskingEnabled({ rules: [] })).toBe(false);
  });
});
