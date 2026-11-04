/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fields } from '@kbn/isomer-components';
import { SURFACE_LIMITS, hasText } from './surface_limits';

describe('SURFACE_LIMITS', () => {
  it('fieldItems matches the components pack', () => {
    const toNode = (length: number) => ({
      type: 'fields',
      items: Array.from({ length }, () => ({ label: 'label', value: 'value' })),
    });

    expect(fields.schema.safeParse(toNode(SURFACE_LIMITS.fieldItems)).success).toBe(true);
    expect(fields.schema.safeParse(toNode(SURFACE_LIMITS.fieldItems + 1)).success).toBe(false);
  });
});

describe('hasText', () => {
  it('requires a non-whitespace character', () => {
    expect(hasText(undefined)).toBe(false);
    expect(hasText(' \n')).toBe(false);
    expect(hasText(' a ')).toBe(true);
  });
});
