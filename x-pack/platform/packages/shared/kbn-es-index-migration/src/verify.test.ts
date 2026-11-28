/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { verifyAdditive } from './verify';

/**
 * These cases are written by hand, not harvested from Kibana's history.
 *
 * Across 114 real mapping changes in the repo there is not one type change applied in
 * place, because it was never possible - so a suite built from real data would score
 * perfectly without ever exercising what the gate exists to catch.
 */

const field = (type: string, extra: Record<string, unknown> = {}) => ({ type, ...extra });
const mapping = (properties: Record<string, unknown>): MappingTypeMapping =>
  ({ properties } as MappingTypeMapping);

const V = mapping({
  name: field('keyword'),
  count: field('long'),
  when: field('date'),
});

describe('verifyAdditive - allowed', () => {
  it('accepts a new field', () => {
    const result = verifyAdditive(V, mapping({ ...V.properties, extra: field('keyword') }));

    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('accepts many new fields at once', () => {
    const result = verifyAdditive(
      V,
      mapping({ ...V.properties, a: field('keyword'), b: field('long'), c: field('ip') })
    );

    expect(result.ok).toBe(true);
  });

  it('accepts a new sub-field on an existing field', () => {
    const result = verifyAdditive(
      V,
      mapping({ ...V.properties, name: field('keyword', { fields: { text: field('text') } }) })
    );

    expect(result.ok).toBe(true);
  });

  it('accepts a new property inside an existing object', () => {
    const before = mapping({ outer: { type: 'object', properties: { a: field('keyword') } } });
    const after = mapping({
      outer: { type: 'object', properties: { a: field('keyword'), b: field('keyword') } },
    });

    expect(verifyAdditive(before, after).ok).toBe(true);
  });

  it.each([
    ['keyword', 'ignore_above', 256, 512],
    ['keyword', 'eager_global_ordinals', false, true],
    ['keyword', 'split_queries_on_whitespace', false, true],
    ['text', 'search_analyzer', 'standard', 'english'],
    ['text', 'fielddata', false, true],
    ['date', 'ignore_malformed', false, true],
    ['long', 'coerce', true, false],
    ['ip', 'ignore_malformed', false, true],
    ['flattened', 'depth_limit', 20, 10],
  ])('accepts %s.%s, which Elasticsearch allows changing', (type, param, from, to) => {
    const before = mapping({ a: field(type, { [param]: from }) });
    const after = mapping({ a: field(type, { [param]: to }) });

    expect(verifyAdditive(before, after).ok).toBe(true);
  });

  it.each(['dynamic', 'dynamic_templates', 'meta'])(
    'accepts a change to %s, which only affects fields that do not exist yet',
    (key) => {
      const before = { ...mapping({ a: field('keyword') }), [key]: 'before' };
      const after = { ...mapping({ a: field('keyword') }), [key]: 'after' };

      expect(verifyAdditive(before as MappingTypeMapping, after as MappingTypeMapping).ok).toBe(
        true
      );
    }
  );

  it('ignores Kibana FieldMap keys that never reach Elasticsearch', () => {
    const before = mapping({ a: { type: 'keyword', array: false, required: false } });
    const after = mapping({ a: { type: 'keyword', array: true, required: true } });

    expect(verifyAdditive(before, after).ok).toBe(true);
  });
});

describe('verifyAdditive - refused', () => {
  it('refuses a changed field type', () => {
    const result = verifyAdditive(V, mapping({ ...V.properties, name: field('text') }));

    expect(result.ok).toBe(false);
    expect(result.violations[0]).toMatchObject({ path: 'name', kind: 'type_changed' });
  });

  it.each([
    ['keyword', 'null_value', 'x', 'y'],
    ['keyword', 'index', true, false],
    ['keyword', 'doc_values', true, false],
    ['keyword', 'store', false, true],
    ['keyword', 'norms', true, false],
    ['text', 'analyzer', 'standard', 'english'],
    ['text', 'index_options', 'positions', 'offsets'],
    ['text', 'term_vector', 'no', 'yes'],
    ['date', 'format', 'strict_date_time', 'epoch_millis'],
    ['date', 'locale', 'ROOT', 'en'],
    ['long', 'null_value', 0, 1],
    ['scaled_float', 'scaling_factor', 100, 1000],
  ])('refuses %s.%s, which Elasticsearch rejects', (type, param, from, to) => {
    const before = mapping({ a: field(type, { [param]: from }) });
    const after = mapping({ a: field(type, { [param]: to }) });

    const result = verifyAdditive(before, after);

    expect(result.ok).toBe(false);
    expect(result.violations[0]).toMatchObject({ path: 'a', kind: 'parameter_immutable' });
    expect(result.violations[0].detail).toContain(param);
  });

  it.each(['subobjects', 'enabled'])(
    'refuses %s, which raises mapper_exception rather than illegal_argument_exception',
    (key) => {
      const before = mapping({ a: { type: 'object', [key]: true } });
      const after = mapping({ a: { type: 'object', [key]: false } });

      const result = verifyAdditive(before, after);

      expect(result.ok).toBe(false);
      expect(result.violations[0].kind).toBe('structural_immutable');
    }
  );

  it('refuses a removed sub-field', () => {
    const before = mapping({ a: field('keyword', { fields: { text: field('text') } }) });
    const after = mapping({ a: field('keyword') });

    const result = verifyAdditive(before, after);

    expect(result.violations[0]).toMatchObject({
      path: 'a.fields.text',
      kind: 'subfield_removed',
    });
  });

  it('refuses a retyped sub-field', () => {
    const before = mapping({ a: field('keyword', { fields: { t: field('text') } }) });
    const after = mapping({ a: field('keyword', { fields: { t: field('keyword') } }) });

    expect(verifyAdditive(before, after).violations[0].kind).toBe('subfield_retyped');
  });

  it('refuses a parameter change on a type it has never classified', () => {
    const before = mapping({ a: field('some_future_type', { knob: 1 }) });
    const after = mapping({ a: field('some_future_type', { knob: 2 }) });

    // Fail-safe: an unknown type has no allowlist, so nothing on it is mutable.
    expect(verifyAdditive(before, after).ok).toBe(false);
  });

  it('finds violations nested inside an object', () => {
    const before = mapping({ outer: { type: 'object', properties: { a: field('keyword') } } });
    const after = mapping({ outer: { type: 'object', properties: { a: field('long') } } });

    expect(verifyAdditive(before, after).violations[0].path).toBe('outer.a');
  });

  it('reports every violation, not just the first', () => {
    const before = mapping({ a: field('keyword'), b: field('date') });
    const after = mapping({ a: field('text'), b: field('long') });

    expect(verifyAdditive(before, after).violations).toHaveLength(2);
  });
});

describe('verifyAdditive - removal depends on backing type', () => {
  const before = mapping({ keep: field('keyword'), drop: field('keyword') });
  const after = mapping({ keep: field('keyword') });

  it('reports drift on a concrete index, where the field is silently kept', () => {
    const result = verifyAdditive(before, after, 'concrete_index');

    expect(result.ok).toBe(true);
    expect(result.drift).toEqual([
      expect.objectContaining({ path: 'drop', kind: 'field_removed' }),
    ]);
  });

  it('stays silent on a rolling template, where removal costs nothing', () => {
    const result = verifyAdditive(before, after, 'rolling_template');

    expect(result.ok).toBe(true);
    expect(result.drift).toEqual([]);
  });

  it('never treats a removal as a violation', () => {
    expect(verifyAdditive(before, after, 'concrete_index').violations).toEqual([]);
    expect(verifyAdditive(before, after, 'rolling_template').violations).toEqual([]);
  });
});
