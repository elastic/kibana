/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKueryForEmbeddableFieldValuePair } from './escape_kuery_for_embeddable_field_value_pair';

describe('escapeKueryForEmbeddableFieldValuePair', () => {
  test('should return correct escaping of kuery values', () => {
    expect(escapeKueryForEmbeddableFieldValuePair('fieldName', '')).toBe('fieldName:""');
    expect(escapeKueryForEmbeddableFieldValuePair('', 'fieldValue')).toBe('"":fieldValue');
    expect(escapeKueryForEmbeddableFieldValuePair('@#specialCharsName%', '<>:;[})')).toBe(
      '@#specialCharsName%:\\<\\>\\:;[}\\)'
    );
  });
});
