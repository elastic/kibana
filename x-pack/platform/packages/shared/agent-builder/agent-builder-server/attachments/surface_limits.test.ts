/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { code, context, fields, header, link, table } from '@kbn/isomer-components';
import { SURFACE_LIMITS, clampText, hasText, toLine } from './surface_limits';

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
      'headerText',
      header.schema,
      SURFACE_LIMITS.headerText,
      (length) => ({ type: 'header', text: text(length) }),
    ],
    [
      'contextText',
      context.schema,
      SURFACE_LIMITS.contextText,
      (length) => ({ type: 'context', items: [{ text: text(length) }] }),
    ],
    [
      'codeText',
      code.schema,
      SURFACE_LIMITS.codeText,
      (length) => ({ type: 'code', text: text(length) }),
    ],
    [
      'fieldLabel',
      fields.schema,
      SURFACE_LIMITS.fieldLabel,
      (length) => ({ type: 'fields', items: [{ label: text(length), value: 'value' }] }),
    ],
    [
      'fieldValue',
      fields.schema,
      SURFACE_LIMITS.fieldValue,
      (length) => ({ type: 'fields', items: [{ label: 'label', value: text(length) }] }),
    ],
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
    [
      'tableCell',
      table.schema,
      SURFACE_LIMITS.tableCell,
      (length) => ({ type: 'table', columns: [{ label: 'Name' }], rows: [[text(length)]] }),
    ],
  ];

  it.each(cases)('%s matches the components pack', (_name, schema, limit, toNode) => {
    expect(schema.safeParse(toNode(limit)).success).toBe(true);
    expect(schema.safeParse(toNode(limit + 1)).success).toBe(false);
  });
});

describe('clampText', () => {
  it('keeps a value within the limit', () => {
    expect(clampText('abc', 3)).toBe('abc');
  });

  it('cuts a longer value to the limit, with an ellipsis', () => {
    expect(clampText('abcdef', 4)).toBe('abc…');
  });
});

describe('toLine', () => {
  it('collapses whitespace before clamping', () => {
    expect(toLine('  a\n\n b  ', 10)).toBe('a b');
  });
});

describe('hasText', () => {
  it('requires a non-whitespace character', () => {
    expect(hasText(undefined)).toBe(false);
    expect(hasText(' \n')).toBe(false);
    expect(hasText(' a ')).toBe(true);
  });
});
