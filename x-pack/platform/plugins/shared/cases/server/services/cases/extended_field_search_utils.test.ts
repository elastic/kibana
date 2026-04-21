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
  parseDateFilterToRange,
} from './extended_field_search_utils';

describe('resolveExtendedFieldFilters', () => {
  const templates = [
    {
      templateId: 'tmpl-a',
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
      templateId: 'tmpl-b',
      fieldNames: [
        { name: 'due_date', label: 'Due Date', type: 'date', control: 'DATE_PICKER' },
        { name: 'score', label: 'Score', type: 'double', control: 'INPUT_NUMBER' },
      ],
    },
  ];

  it('resolves labels to storage keys, returning one group per user label', () => {
    const result = resolveExtendedFieldFilters(
      [
        { label: 'Priority', value: 'high' },
        { label: 'Region', value: 'emea' },
      ],
      templates
    );

    expect(result).toEqual([
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateIds: ['tmpl-a'],
        },
      ],
      [
        {
          storageKey: 'region_as_keyword',
          value: 'emea',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);
  });

  it('is case-insensitive for label matching', () => {
    const result = resolveExtendedFieldFilters([{ label: 'PRIORITY', value: 'high' }], templates);

    expect(result).toEqual([
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);
  });

  it('resolves labels with spaces (multi-word labels)', () => {
    const result = resolveExtendedFieldFilters([{ label: 'effort level', value: '5' }], templates);

    expect(result).toEqual([
      [
        {
          storageKey: 'effort_as_integer',
          value: '5',
          esType: 'integer',
          control: 'INPUT_NUMBER',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);
  });

  it('resolves CHECKBOX_GROUP fields and carries control through', () => {
    const result = resolveExtendedFieldFilters(
      [{ label: 'Affected Components', value: 'api' }],
      templates
    );

    expect(result).toEqual([
      [
        {
          storageKey: 'components_as_keyword',
          value: 'api',
          esType: 'keyword',
          control: 'CHECKBOX_GROUP',
          templateIds: ['tmpl-a'],
        },
      ],
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
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);
  });

  it('returns empty for no matches', () => {
    const result = resolveExtendedFieldFilters(
      [{ label: 'nonexistent', value: 'test' }],
      templates
    );

    expect(result).toEqual([]);
  });

  it('resolves USER_PICKER fields and carries control through', () => {
    const result = resolveExtendedFieldFilters(
      [{ label: 'reviewers', value: 'elastic' }],
      [
        {
          templateId: 'tmpl-c',
          fieldNames: [
            { name: 'reviewers', label: 'Reviewers', type: 'keyword', control: 'USER_PICKER' },
          ],
        },
      ]
    );

    expect(result).toEqual([
      [
        {
          storageKey: 'reviewers_as_keyword',
          value: 'elastic',
          esType: 'keyword',
          control: 'USER_PICKER',
          templateIds: ['tmpl-c'],
        },
      ],
    ]);
  });

  it('handles templates with no fieldNames', () => {
    const result = resolveExtendedFieldFilters(
      [{ label: 'Priority', value: 'high' }],
      [{ templateId: 'tmpl-x', fieldNames: undefined }]
    );

    expect(result).toEqual([]);
  });

  it('groups multiple storage keys under one label when different templates share the same label but different names', () => {
    // "Estimate" appears in two templates with different field names.
    // Searching by "Estimate" should OR both storage keys so all three cases are returned.
    const result = resolveExtendedFieldFilters(
      [{ label: 'Estimate', value: '3' }],
      [
        {
          templateId: 'tmpl-x',
          fieldNames: [
            { name: 'effort', label: 'Estimate', type: 'integer', control: 'INPUT_NUMBER' },
          ],
        },
        {
          templateId: 'tmpl-y',
          fieldNames: [
            { name: 'story_points', label: 'Estimate', type: 'integer', control: 'INPUT_NUMBER' },
          ],
        },
        {
          templateId: 'tmpl-z',
          fieldNames: [
            { name: 'effort', label: 'Estimate', type: 'integer', control: 'INPUT_NUMBER' },
          ],
        },
      ]
    );

    // tmpl-x and tmpl-z share the same storage key so they merge into one entry; tmpl-y has its own.
    expect(result).toHaveLength(1);
    const group = result[0];
    expect(group).toHaveLength(2);
    expect(group).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          storageKey: 'effort_as_integer',
          templateIds: expect.arrayContaining(['tmpl-x', 'tmpl-z']),
        }),
        expect.objectContaining({
          storageKey: 'story_points_as_integer',
          templateIds: ['tmpl-y'],
        }),
      ])
    );
  });

  it('scopes templateIds correctly when same label AND same field name appear in multiple templates', () => {
    // Same label + same storage key → merged into one entry with both templateIds collected.
    const result = resolveExtendedFieldFilters(
      [{ label: 'Priority', value: 'high' }],
      [
        {
          templateId: 'tmpl-1',
          fieldNames: [
            { name: 'prio', label: 'Priority', type: 'keyword', control: 'SELECT_BASIC' },
          ],
        },
        {
          templateId: 'tmpl-2',
          fieldNames: [
            { name: 'prio', label: 'Priority', type: 'keyword', control: 'SELECT_BASIC' },
          ],
        },
      ]
    );

    expect(result).toEqual([
      [
        expect.objectContaining({
          storageKey: 'prio_as_keyword',
          templateIds: expect.arrayContaining(['tmpl-1', 'tmpl-2']),
        }),
      ],
    ]);
  });
});

describe('parseDateFilterToRange', () => {
  it('parses MM/DD/YYYY to a full-day UTC range', () => {
    expect(parseDateFilterToRange('01/01/2024')).toEqual({
      gte: '2024-01-01T00:00:00.000Z',
      lt: '2024-01-02T00:00:00.000Z',
    });
  });

  it('parses YYYY-MM-DD to a full-day UTC range', () => {
    expect(parseDateFilterToRange('2024-01-01')).toEqual({
      gte: '2024-01-01T00:00:00.000Z',
      lt: '2024-01-02T00:00:00.000Z',
    });
  });

  it('parses ISO 8601 string by truncating to the day', () => {
    expect(parseDateFilterToRange('2024-01-01T00:00:00.000Z')).toEqual({
      gte: '2024-01-01T00:00:00.000Z',
      lt: '2024-01-02T00:00:00.000Z',
    });
  });

  it('returns undefined for unrecognised formats', () => {
    expect(parseDateFilterToRange('not-a-date')).toBeUndefined();
    expect(parseDateFilterToRange('')).toBeUndefined();
    expect(parseDateFilterToRange('2024/01/01')).toBeUndefined();
  });

  it('returns undefined for out-of-range month or day', () => {
    expect(parseDateFilterToRange('13/01/2024')).toBeUndefined();
    expect(parseDateFilterToRange('00/01/2024')).toBeUndefined();
  });
});

describe('buildExtendedFieldRuntimeMappings', () => {
  it('builds keyword runtime field that auto-detects JSON arrays', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateIds: ['tmpl-a'],
        },
      ],
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
      [
        {
          storageKey: 'effort_as_integer',
          value: '5',
          esType: 'integer',
          control: 'INPUT_NUMBER',
          templateIds: ['tmpl-a'],
        },
      ],
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
      [
        {
          storageKey: 'score_as_double',
          value: '3.5',
          esType: 'double',
          control: 'INPUT_NUMBER',
          templateIds: ['tmpl-b'],
        },
      ],
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

  it('builds date runtime field as keyword type that emits the raw ISO string', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'due_date_as_date',
          value: '2025-01-01',
          esType: 'date',
          control: 'DATE_PICKER',
          templateIds: ['tmpl-b'],
        },
      ],
    ]);

    expect(mappings.ef_due_date_as_date.type).toBe('keyword');
    const src = (mappings.ef_due_date_as_date.script as { source: string })?.source ?? '';
    expect(src).toContain('emit(raw)');
    expect(src).not.toContain('SimpleDateFormat');
  });

  it('builds DATE_PICKER runtime field as keyword type that emits the raw ISO string', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'start_date_as_date',
          value: '01/01/2024',
          esType: 'date',
          control: 'DATE_PICKER',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);

    expect(mappings.ef_start_date_as_date.type).toBe('keyword');

    const src = (mappings.ef_start_date_as_date.script as { source: string })?.source ?? '';
    expect(src).toContain('params._source');
    expect(src).toContain('start_date_as_date');
    expect(src).toContain('emit(raw)');
    expect(src).not.toContain('SimpleDateFormat');
    expect(src).not.toContain('?.');
  });

  it('builds USER_PICKER runtime field that extracts name values from {uid,name} objects', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'reviewers_as_keyword',
          value: 'elastic',
          esType: 'keyword',
          control: 'USER_PICKER',
          templateIds: ['tmpl-c'],
        },
      ],
    ]);

    const src = (mappings.ef_reviewers_as_keyword.script as { source: string })?.source ?? '';
    expect(src).toContain('params._source');
    expect(src).toContain('reviewers_as_keyword');
    // Must use name-capture regex, not the plain splitArrayScript
    expect(src).toContain('"name":"([^"]*)"');
    expect(src).toContain('m.group(1)');
    // Must NOT use the splitArrayScript path (which leaves '{uid:...' tokens)
    expect(src).not.toContain('replaceAll');
    expect(src).not.toContain('?.');
  });

  it('builds checkbox runtime field that reads _source and emits individual array elements', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'components_as_keyword',
          value: 'api',
          esType: 'keyword',
          control: 'CHECKBOX_GROUP',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);

    const src = (mappings.ef_components_as_keyword.script as { source: string })?.source ?? '';
    expect(src).toContain('params._source');
    expect(src).toContain('components_as_keyword');
    expect(src).toContain('replaceAll');
    expect(src).not.toContain('Long.parseLong');
    expect(src).not.toContain('?.');
  });

  it('builds multiple runtime fields from multiple groups', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateIds: ['tmpl-a'],
        },
      ],
      [
        {
          storageKey: 'effort_as_integer',
          value: '5',
          esType: 'integer',
          control: 'INPUT_NUMBER',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);

    expect(Object.keys(mappings)).toEqual(['ef_priority_as_keyword', 'ef_effort_as_integer']);
  });
});

describe('buildExtendedFieldFilterClauses', () => {
  it('builds a scoped bool.filter clause for a single keyword field', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            { term: { ef_priority_as_keyword: { value: 'high' } } },
            { terms: { 'cases.template.id': ['tmpl-a'] } },
          ],
        },
      },
    ]);
  });

  it('builds term queries with numeric value for integer fields', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'effort_as_integer',
          value: '5',
          esType: 'integer',
          control: 'INPUT_NUMBER',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            { term: { ef_effort_as_integer: { value: 5 } } },
            { terms: { 'cases.template.id': ['tmpl-a'] } },
          ],
        },
      },
    ]);
  });

  it('builds term queries with numeric value for double fields', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'score_as_double',
          value: '3.5',
          esType: 'double',
          control: 'INPUT_NUMBER',
          templateIds: ['tmpl-b'],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            { term: { ef_score_as_double: { value: 3.5 } } },
            { terms: { 'cases.template.id': ['tmpl-b'] } },
          ],
        },
      },
    ]);
  });

  it('builds term query for CHECKBOX_GROUP (runtime field emits individual items)', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'components_as_keyword',
          value: 'api',
          esType: 'keyword',
          control: 'CHECKBOX_GROUP',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            { term: { ef_components_as_keyword: { value: 'api' } } },
            { terms: { 'cases.template.id': ['tmpl-a'] } },
          ],
        },
      },
    ]);
  });

  it('builds range query for DATE_PICKER using MM/DD/YYYY input', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'start_date_as_date',
          value: '01/01/2024',
          esType: 'date',
          control: 'DATE_PICKER',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            {
              range: {
                ef_start_date_as_date: {
                  gte: '2024-01-01T00:00:00.000Z',
                  lt: '2024-01-02T00:00:00.000Z',
                },
              },
            },
            { terms: { 'cases.template.id': ['tmpl-a'] } },
          ],
        },
      },
    ]);
  });

  it('builds range query for DATE_PICKER using YYYY-MM-DD input', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'start_date_as_date',
          value: '2024-01-01',
          esType: 'date',
          control: 'DATE_PICKER',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            {
              range: {
                ef_start_date_as_date: {
                  gte: '2024-01-01T00:00:00.000Z',
                  lt: '2024-01-02T00:00:00.000Z',
                },
              },
            },
            { terms: { 'cases.template.id': ['tmpl-a'] } },
          ],
        },
      },
    ]);
  });

  it('drops DATE_PICKER filter when the date value cannot be parsed', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'start_date_as_date',
          value: 'not-a-date',
          esType: 'date',
          control: 'DATE_PICKER',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);

    expect(clauses).toHaveLength(0);
  });

  it('builds term query for USER_PICKER (runtime field emits name values from {uid,name} objects)', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'reviewers_as_keyword',
          value: 'elastic',
          esType: 'keyword',
          control: 'USER_PICKER',
          templateIds: ['tmpl-c'],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            { term: { ef_reviewers_as_keyword: { value: 'elastic' } } },
            { terms: { 'cases.template.id': ['tmpl-c'] } },
          ],
        },
      },
    ]);
  });

  it('AND-combines clauses from different label groups', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateIds: ['tmpl-a'],
        },
      ],
      [
        {
          storageKey: 'region_as_keyword',
          value: 'emea',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);

    // Two separate filter clauses — query builder wraps them in bool.filter (AND)
    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toEqual({
      bool: {
        filter: [
          { term: { ef_priority_as_keyword: { value: 'high' } } },
          { terms: { 'cases.template.id': ['tmpl-a'] } },
        ],
      },
    });
    expect(clauses[1]).toEqual({
      bool: {
        filter: [
          { term: { ef_region_as_keyword: { value: 'emea' } } },
          { terms: { 'cases.template.id': ['tmpl-a'] } },
        ],
      },
    });
  });

  it('OR-combines entries within the same label group (same label, different field names across templates)', () => {
    // "Estimate" maps to two storage keys from different templates.
    // The resulting clause should be a bool.should so a case matching either is returned.
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'effort_as_integer',
          value: '3',
          esType: 'integer',
          control: 'INPUT_NUMBER',
          templateIds: ['tmpl-x', 'tmpl-z'],
        },
        {
          storageKey: 'story_points_as_integer',
          value: '3',
          esType: 'integer',
          control: 'INPUT_NUMBER',
          templateIds: ['tmpl-y'],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          should: [
            {
              bool: {
                filter: [
                  { term: { ef_effort_as_integer: { value: 3 } } },
                  { terms: { 'cases.template.id': ['tmpl-x', 'tmpl-z'] } },
                ],
              },
            },
            {
              bool: {
                filter: [
                  { term: { ef_story_points_as_integer: { value: 3 } } },
                  { terms: { 'cases.template.id': ['tmpl-y'] } },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ]);
  });

  it('does not add an extra should wrapper when a group has only one entry', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateIds: ['tmpl-a'],
        },
      ],
    ]);

    // Single entry — no should wrapper
    expect(clauses[0]).not.toHaveProperty('bool.should');
    expect(clauses[0]).toEqual({
      bool: {
        filter: [
          { term: { ef_priority_as_keyword: { value: 'high' } } },
          { terms: { 'cases.template.id': ['tmpl-a'] } },
        ],
      },
    });
  });
});
