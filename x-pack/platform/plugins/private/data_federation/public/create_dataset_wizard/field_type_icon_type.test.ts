/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeFieldTypeForIcon } from './field_type_icon_type';

describe('normalizeFieldTypeForIcon', () => {
  it.each([
    ['numeric', 'number'],
    ['token_count', 'number'],
    ['range', 'number_range'],
    ['object', 'nested'],
    ['join', 'nested'],
    ['completion', 'search_as_you_type'],
    ['alias', 'keyword'],
  ])('maps %s to %s', (type, expectedIconType) => {
    expect(normalizeFieldTypeForIcon(type)).toBe(expectedIconType);
  });

  it('returns known icon types unchanged', () => {
    expect(normalizeFieldTypeForIcon('integer')).toBe('integer');
    expect(normalizeFieldTypeForIcon('date')).toBe('date');
  });

  it('returns unmapped types unchanged', () => {
    expect(normalizeFieldTypeForIcon('other')).toBe('other');
  });
});
