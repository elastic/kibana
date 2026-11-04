/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fields, link } from '@kbn/isomer-components';
import { SURFACE_LIMITS, hasText } from './surface_limits';

const text = (length: number) => 'x'.repeat(length);

describe('SURFACE_LIMITS', () => {
  const cases: Array<
    [
      string,
      { safeParse: (node: unknown) => { success: boolean } },
      number,
      (length: number) => unknown
    ]
  > = [
    [
      'fieldItems',
      fields.schema,
      SURFACE_LIMITS.fieldItems,
      (length) => ({
        type: 'fields',
        items: Array.from({ length }, () => ({ label: 'label', value: 'value' })),
      }),
    ],
    [
      'linkPath',
      link.schema,
      SURFACE_LIMITS.linkPath,
      (length) => ({ type: 'link', label: 'Open', app: 'discover', path: `/${text(length - 1)}` }),
    ],
  ];

  it.each(cases)('%s matches the components pack', (_name, schema, limit, toNode) => {
    expect(schema.safeParse(toNode(limit)).success).toBe(true);
    expect(schema.safeParse(toNode(limit + 1)).success).toBe(false);
  });
});

describe('hasText', () => {
  it('requires a non-whitespace character', () => {
    expect(hasText(undefined)).toBe(false);
    expect(hasText(' \n')).toBe(false);
    expect(hasText(' a ')).toBe(true);
  });
});
