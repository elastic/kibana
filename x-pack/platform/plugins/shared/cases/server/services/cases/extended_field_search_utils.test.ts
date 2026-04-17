/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  resolveExtendedFieldFilters,
  buildExtendedFieldRuntimeMappings,
  buildExtendedFieldFilterClauses,
} from './extended_field_search_utils';

describe('resolveExtendedFieldFilters', () => {
  const templates = [
    {
      fieldNames: [
        { name: 'priority', label: 'Priority', type: 'keyword', control: 'SELECT_BASIC' },
        { name: 'region', label: 'Region', type: 'keyword', control: 'SELECT_BASIC' },
        { name: 'effort', label: 'Effort Level', type: 'integer', control: 'INPUT_NUMBER' },
        {
          name: 'components',
          label: 'Affected Components',
          type: 'keyword',
          control: 'CHECKBOX_GROUP',
        },
      ],
    },
    {
      fieldNames: [
        { name: 'due_date', label: 'Due Date', type: 'date', control: 'DATE_PICKER' },
        { name: 'score', label: 'Score', type: 'double', control: 'INPUT_NUMBER' },
      ],
    },
  ];

  it('resolves labels to storage keys', () => {
    const result = resolveExtendedFieldFilters(
      [
        { label: 'Priority', value: 'high' },
        { label: 'Region', value: 'emea' },
      ],
      templates
    );

    expect(result).toEqual([
      {
        storageKey: 'priority_as_keyword',
        value: 'high',
        esType: 'keyword',
        control: 'SELECT_BASIC',
      },
      {
        storageKey: 'region_as_keyword',
        value: 'emea',
        esType: 'keyword',
        control: 'SELECT_BASIC',
      },
    ]);
  });

  it('is case-insensitive for label matching', () => {
    const result = resolveExtendedFieldFilters([{ label: 'PRIORITY', value: 'high' }], templates);

    expect(result).toEqual([
      {
        storageKey: 'priority_as_keyword',
        value: 'high',
        esType: 'keyword',
        control: 'SELECT_BASIC',
      },
    ]);
  });

  it('resolves labels with spaces (multi-word labels)', () => {
    const result = resolveExtendedFieldFilters([{ label: 'effort level', value: '5' }], templates);

    expect(result).toEqual([
      { storageKey: 'effort_as_integer', value: '5', esType: 'integer', control: 'INPUT_NUMBER' },
    ]);
  });

  it('resolves CHECKBOX_GROUP fields and carries control through', () => {
    const result = resolveExtendedFieldFilters(
      [{ label: 'Affected Components', value: 'api' }],
      templates
    );

    expect(result).toEqual([
      {
        storageKey: 'components_as_keyword',
        value: 'api',
        esType: 'keyword',
        control: 'CHECKBOX_GROUP',
      },
    ]);
  });

  it('drops unresolved labels silently', () => {
    const result = resolveExtendedFieldFilters(
      [
        { label: 'Priority', value: 'high' },
        { label: 'nonexistent', value: 'test' },
      ],
      templates
    );

    expect(result).toEqual([
      {
        storageKey: 'priority_as_keyword',
        value: 'high',
        esType: 'keyword',
        control: 'SELECT_BASIC',
      },
    ]);
  });

  it('returns empty for no matches', () => {
    const result = resolveExtendedFieldFilters(
      [{ label: 'nonexistent', value: 'test' }],
      templates
    );

    expect(result).toEqual([]);
  });

  it('handles templates with no fieldNames', () => {
    const result = resolveExtendedFieldFilters(
      [{ label: 'Priority', value: 'high' }],
      [{ fieldNames: undefined }]
    );

    expect(result).toEqual([]);
  });
});

describe('buildExtendedFieldRuntimeMappings', () => {
  it('builds keyword runtime field that auto-detects JSON arrays', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      {
        storageKey: 'priority_as_keyword',
        value: 'high',
        esType: 'keyword',
        control: 'SELECT_BASIC',
      },
    ]);

    const src = (mappings.ef_priority_as_keyword.script as { source: string })?.source ?? '';
    expect(src).toContain('params._source');
    expect(src).toContain('priority_as_keyword');
    // Auto-detect: if value starts with '[', split as array; otherwise emit plain
    expect(src).toContain("raw.startsWith('[')");
    expect(src).toContain('emit(raw)');
    expect(src).not.toContain('?.');
  });

  it('builds long runtime field for integer type', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      { storageKey: 'effort_as_integer', value: '5', esType: 'integer', control: 'INPUT_NUMBER' },
    ]);

    expect(mappings).toEqual({
      ef_effort_as_integer: {
        type: 'long',
        script: {
          source: expect.stringContaining('Long.parseLong'),
        },
      },
    });
  });

  it('builds double runtime field for float type', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      { storageKey: 'score_as_double', value: '3.5', esType: 'double', control: 'INPUT_NUMBER' },
    ]);

    expect(mappings).toEqual({
      ef_score_as_double: {
        type: 'double',
        script: {
          source: expect.stringContaining('Double.parseDouble'),
        },
      },
    });
  });

  it('builds date runtime field', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      {
        storageKey: 'due_date_as_date',
        value: '2025-01-01',
        esType: 'date',
        control: 'DATE_PICKER',
      },
    ]);

    expect(mappings).toEqual({
      ef_due_date_as_date: {
        type: 'date',
        script: {
          source: expect.stringContaining('SimpleDateFormat'),
        },
      },
    });
  });

  it('builds checkbox runtime field that reads _source and emits individual array elements', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      {
        storageKey: 'components_as_keyword',
        value: 'api',
        esType: 'keyword',
        control: 'CHECKBOX_GROUP',
      },
    ]);

    const src = (mappings.ef_components_as_keyword.script as { source: string })?.source ?? '';
    expect(src).toContain('params._source');
    expect(src).toContain('components_as_keyword');
    expect(src).toContain('replaceAll');
    expect(src).not.toContain('Long.parseLong');
    expect(src).not.toContain('?.');
  });

  it('builds multiple runtime fields', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      {
        storageKey: 'priority_as_keyword',
        value: 'high',
        esType: 'keyword',
        control: 'SELECT_BASIC',
      },
      { storageKey: 'effort_as_integer', value: '5', esType: 'integer', control: 'INPUT_NUMBER' },
    ]);

    expect(Object.keys(mappings)).toEqual(['ef_priority_as_keyword', 'ef_effort_as_integer']);
  });
});

describe('buildExtendedFieldFilterClauses', () => {
  it('builds term queries for keyword fields', () => {
    const clauses = buildExtendedFieldFilterClauses([
      {
        storageKey: 'priority_as_keyword',
        value: 'high',
        esType: 'keyword',
        control: 'SELECT_BASIC',
      },
    ]);

    expect(clauses).toEqual([{ term: { ef_priority_as_keyword: { value: 'high' } } }]);
  });

  it('builds term queries with numeric value for integer fields', () => {
    const clauses = buildExtendedFieldFilterClauses([
      { storageKey: 'effort_as_integer', value: '5', esType: 'integer', control: 'INPUT_NUMBER' },
    ]);

    expect(clauses).toEqual([{ term: { ef_effort_as_integer: { value: 5 } } }]);
  });

  it('builds term query for CHECKBOX_GROUP (runtime field emits individual items)', () => {
    const clauses = buildExtendedFieldFilterClauses([
      {
        storageKey: 'components_as_keyword',
        value: 'api',
        esType: 'keyword',
        control: 'CHECKBOX_GROUP',
      },
    ]);

    // The runtime field emits individual items, so a term query on "api" will match
    // cases where "api" is one of the selected checkboxes
    expect(clauses).toEqual([{ term: { ef_components_as_keyword: { value: 'api' } } }]);
  });

  it('builds multiple AND-combined filter clauses', () => {
    const clauses = buildExtendedFieldFilterClauses([
      {
        storageKey: 'priority_as_keyword',
        value: 'high',
        esType: 'keyword',
        control: 'SELECT_BASIC',
      },
      {
        storageKey: 'region_as_keyword',
        value: 'emea',
        esType: 'keyword',
        control: 'SELECT_BASIC',
      },
    ]);

    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toEqual({ term: { ef_priority_as_keyword: { value: 'high' } } });
    expect(clauses[1]).toEqual({ term: { ef_region_as_keyword: { value: 'emea' } } });
  });
});
