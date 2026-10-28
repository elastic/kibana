/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { anonymizationSettingsSchema } from './anonymization_settings';

const rule = (index: number) => ({
  type: 'RegExp' as const,
  id: `custom-${index}`,
  pattern: 'x',
  entityClass: 'X',
  enabled: true,
});

describe('anonymizationSettingsSchema', () => {
  it('accepts a full 100-rule list plus a newly appended built-in rule', () => {
    const rules = Array.from({ length: 101 }, (_, index) => rule(index));
    expect(() => anonymizationSettingsSchema.validate({ rules })).not.toThrow();
  });

  it('still bounds the rule list', () => {
    const rules = Array.from({ length: 151 }, (_, index) => rule(index));
    expect(() => anonymizationSettingsSchema.validate({ rules })).toThrow();
  });
});
