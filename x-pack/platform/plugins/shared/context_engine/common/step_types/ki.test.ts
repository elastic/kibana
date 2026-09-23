/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kiFieldsSchema,
  kiPartialFieldsSchema,
  MAX_KI_ATTRIBUTES,
  MAX_KI_ATTRIBUTE_ARRAY_VALUES,
  MAX_KI_ATTRIBUTE_VALUE_LENGTH,
  MAX_KI_REFERENCES,
} from './ki';

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

  it('accepts a string attribute value at MAX_KI_ATTRIBUTE_VALUE_LENGTH', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      attributes: { esql: 'q'.repeat(MAX_KI_ATTRIBUTE_VALUE_LENGTH) },
    });

    expect(result.success).toBe(true);
  });

  it('rejects a string attribute value longer than MAX_KI_ATTRIBUTE_VALUE_LENGTH', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      attributes: { esql: 'q'.repeat(MAX_KI_ATTRIBUTE_VALUE_LENGTH + 1) },
    });

    expect(result.success).toBe(false);
  });

  it('accepts an array-of-strings attribute value', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      attributes: { esql: ['FROM logs-* | LIMIT 1', 'FROM metrics-* | LIMIT 1'] },
    });

    expect(result.success).toBe(true);
  });

  it('rejects an array attribute value with more than MAX_KI_ATTRIBUTE_ARRAY_VALUES entries', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      attributes: { esql: Array.from({ length: MAX_KI_ATTRIBUTE_ARRAY_VALUES + 1 }, () => 'q') },
    });

    expect(result.success).toBe(false);
  });

  it('rejects an array attribute value with non-string entries', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      attributes: { esql: ['FROM logs-* | LIMIT 1', 42] },
    });

    expect(result.success).toBe(false);
  });

  it('accepts references with relation and description', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      references: [
        { uri: 'index://logs-*', relation: 'derived_from', description: 'profiled index' },
        { uri: 'dashboard://a1b2' },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects a reference without a uri', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      references: [{ relation: 'relates_to' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a reference with an unknown relation', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      references: [{ uri: 'index://logs-*', relation: 'contradicts' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects more than MAX_KI_REFERENCES references', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      references: Array.from({ length: MAX_KI_REFERENCES + 1 }, (_, i) => ({
        uri: `ki://idx/${i}`,
      })),
    });

    expect(result.success).toBe(false);
  });

  it('accepts an ISO 8601 expires_at', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      expires_at: '2026-10-01T00:00:00Z',
    });

    expect(result.success).toBe(true);
  });

  it('accepts an expires_at with a numeric timezone offset', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      expires_at: '2027-01-01T01:00:00+01:00',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a null expires_at on create', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      expires_at: null,
    });

    expect(result.success).toBe(false);
  });

  it('accepts a null expires_at on update to clear the expiry', () => {
    const result = kiPartialFieldsSchema.safeParse({ expires_at: null });

    expect(result.success).toBe(true);
  });

  it('rejects a non-ISO expires_at', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      expires_at: 'next week',
    });

    expect(result.success).toBe(false);
  });
});
