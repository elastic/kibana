/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlCastFunctionForType, extendedFieldsToEval } from './extended_fields_to_eval';

describe('esqlCastFunctionForType', () => {
  it.each([
    ['long', 'TO_LONG'],
    ['integer', 'TO_LONG'],
    ['short', 'TO_LONG'],
    ['byte', 'TO_LONG'],
    ['unsigned_long', 'TO_LONG'],
    ['double', 'TO_DOUBLE'],
    ['float', 'TO_DOUBLE'],
    ['half_float', 'TO_DOUBLE'],
    ['scaled_float', 'TO_DOUBLE'],
    ['date', 'TO_DATETIME'],
  ])('maps %s -> %s', (type, expected) => {
    expect(esqlCastFunctionForType(type)).toBe(expected);
  });

  it('returns null for keyword (flattened sub-keys are already keyword)', () => {
    expect(esqlCastFunctionForType('keyword')).toBeNull();
  });

  it('returns null for unknown types so the column degrades to a rename rather than throwing inside the view query', () => {
    expect(esqlCastFunctionForType('not_a_real_es_type')).toBeNull();
  });
});

describe('extendedFieldsToEval', () => {
  it('emits one EVAL per (name, type) pair with the snake_case output column matching the flattened key 1:1, and the matching cast', () => {
    const out = extendedFieldsToEval([
      { name: 'riskScore', type: 'long' },
      { name: 'incidentDate', type: 'date' },
      { name: 'summary', type: 'keyword' },
      { name: 'lossUsd', type: 'double' },
    ]);
    expect(out).toEqual([
      {
        snakeKey: 'riskScore_as_long',
        columnKey: 'riskScore_as_long',
        evalLine:
          'riskScore_as_long = TO_LONG(JSON_EXTRACT(_source, "cases.extended_fields.riskScore_as_long"))',
      },
      {
        snakeKey: 'incidentDate_as_date',
        columnKey: 'incidentDate_as_date',
        evalLine:
          'incidentDate_as_date = TO_DATETIME(JSON_EXTRACT(_source, "cases.extended_fields.incidentDate_as_date"))',
      },
      {
        snakeKey: 'summary_as_keyword',
        columnKey: 'summary_as_keyword',
        evalLine:
          'summary_as_keyword = JSON_EXTRACT(_source, "cases.extended_fields.summary_as_keyword")',
      },
      {
        snakeKey: 'lossUsd_as_double',
        columnKey: 'lossUsd_as_double',
        evalLine:
          'lossUsd_as_double = TO_DOUBLE(JSON_EXTRACT(_source, "cases.extended_fields.lossUsd_as_double"))',
      },
    ]);
  });

  it('deduplicates identical (name, type) pairs but keeps same-name-different-type as distinct columns', () => {
    // Two owners can independently declare a `riskScore` field with different types.
    // Both flattened keys exist; the view exposes both.
    const out = extendedFieldsToEval([
      { name: 'riskScore', type: 'long' },
      { name: 'riskScore', type: 'long' }, // exact dupe — collapses
      { name: 'riskScore', type: 'keyword' }, // same name, different type — kept
    ]);
    expect(out.map((e) => e.columnKey)).toEqual([
      'riskScore_as_long',
      'riskScore_as_keyword',
    ]);
  });

  it('returns an empty array when given no template fields', () => {
    expect(extendedFieldsToEval([])).toEqual([]);
  });

  it('preserves input order so view query diffs are stable when the same template list is rebuilt', () => {
    const input = [
      { name: 'b', type: 'long' },
      { name: 'a', type: 'keyword' },
      { name: 'c', type: 'date' },
    ];
    expect(extendedFieldsToEval(input).map((e) => e.columnKey)).toEqual([
      'b_as_long',
      'a_as_keyword',
      'c_as_date',
    ]);
  });
});
