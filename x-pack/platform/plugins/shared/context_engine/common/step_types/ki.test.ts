/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kiFieldsSchema, MAX_KI_ATTRIBUTES } from './ki';

describe('kiFieldsSchema', () => {
  const buildAttributes = (count: number): Record<string, string> =>
    Object.fromEntries(Array.from({ length: count }, (_, i) => [`key_${i}`, 'value']));

  it('accepts attributes with up to MAX_KI_ATTRIBUTES entries', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      attributes: buildAttributes(MAX_KI_ATTRIBUTES),
    });

    expect(result.success).toBe(true);
  });

  it('rejects attributes with more than MAX_KI_ATTRIBUTES entries', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      attributes: buildAttributes(MAX_KI_ATTRIBUTES + 1),
    });

    expect(result.success).toBe(false);
  });
});
