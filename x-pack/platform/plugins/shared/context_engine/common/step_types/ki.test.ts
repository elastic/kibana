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
  omitNullKiAttributes,
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

  it('omits an attribute whose value is null, so a template can write `| default: nil`', () => {
    // A KI with no runnable query must not carry `esql: null` or `esql: []`: the ES|QL verifiers
    // apply whenever the attribute is present, and fail it when it is empty.
    const result = kiFieldsSchema.safeParse({
      type: 'document',
      title: 'title',
      attributes: { esql: null, topics: ['billing'] },
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.attributes).toEqual({ topics: ['billing'] });
  });

  it('still rejects an undefined attribute value, which is a missing variable rather than an omission', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'document',
      title: 'title',
      attributes: { esql: undefined },
    });

    expect(result.success).toBe(false);
  });

  it('counts null attributes toward MAX_KI_ATTRIBUTES before omitting them', () => {
    const result = kiFieldsSchema.safeParse({
      type: 'index_metadata',
      title: 'title',
      attributes: { ...buildAttributes(MAX_KI_ATTRIBUTES), extra: null },
    });

    expect(result.success).toBe(false);
  });

  it('keeps null meaning "clear the expiry" on update while dropping null attributes', () => {
    const result = kiPartialFieldsSchema.safeParse({
      expires_at: null,
      attributes: { esql: null, doc_count: 3 },
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({
      expires_at: null,
      attributes: { doc_count: 3 },
    });
  });

  it('does not treat null as an omission outside attributes', () => {
    expect(
      kiFieldsSchema.safeParse({ type: 'index_metadata', title: 'title', references: null }).success
    ).toBe(false);
    expect(
      kiFieldsSchema.safeParse({ type: 'index_metadata', title: 'title', references: [null] })
        .success
    ).toBe(false);
  });
});

describe('omitNullKiAttributes', () => {
  it('drops null attributes and leaves every other field untouched', () => {
    expect(
      omitNullKiAttributes({
        title: 'title',
        expires_at: null,
        attributes: { esql: null, unit: 'sku-1' },
      })
    ).toEqual({ title: 'title', expires_at: null, attributes: { unit: 'sku-1' } });
  });

  it('removes attributes entirely when every value was null, so a patch writes no empty object', () => {
    expect(omitNullKiAttributes({ title: 'title', attributes: { esql: null } })).toEqual({
      title: 'title',
    });
  });

  it('keeps an attributes object that was empty to begin with', () => {
    expect(omitNullKiAttributes({ attributes: {} })).toEqual({ attributes: {} });
  });

  it('returns a KI without attributes as it is', () => {
    const ki = { title: 'title' };

    expect(omitNullKiAttributes(ki)).toBe(ki);
  });
});
