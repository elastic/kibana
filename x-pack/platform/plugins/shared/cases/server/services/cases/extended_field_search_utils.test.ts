/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  resolveExtendedFieldFilters,
  buildExtendedFieldRuntimeMappings,
  buildExtendedFieldFilterClauses,
  parseDateFilterToRange,
  tokenizeSearchForLabels,
  resolveFieldLabelSearch,
  buildFieldLabelRuntimeMappings,
  buildFieldLabelExistsClauses,
  buildAllExtendedFieldValuesRuntimeMapping,
  EF_ALL_VALUES_FIELD,
} from './extended_field_search_utils';

describe('resolveExtendedFieldFilters', () => {
  const templates = [
    {
      templateId: 'tmpl-a',
      templateVersion: 1,
      fieldDefinitions: [
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
      templateVersion: 1,
      fieldDefinitions: [
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
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
      [
        {
          storageKey: 'region_as_keyword',
          value: 'emea',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
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
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
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
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
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
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);
  });

  it('returns an empty group for an unresolved label instead of dropping it', () => {
    // The empty group is preserved (rather than omitted) so buildExtendedFieldFilterClauses can
    // turn it into a match_none clause — filtering by an unknown label should yield zero results,
    // not silently be ignored.
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
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
      [],
    ]);
  });

  it('returns a single empty group when no filters match', () => {
    const result = resolveExtendedFieldFilters(
      [{ label: 'nonexistent', value: 'test' }],
      templates
    );

    expect(result).toEqual([[]]);
  });

  it('resolves USER_PICKER fields and carries control through', () => {
    const result = resolveExtendedFieldFilters(
      [{ label: 'reviewers', value: 'elastic' }],
      [
        {
          templateId: 'tmpl-c',
          templateVersion: 1,
          fieldDefinitions: [
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
          templateVersions: [{ id: 'tmpl-c', version: 1 }],
        },
      ],
    ]);
  });

  it('handles templates with no fieldDefinitions', () => {
    const result = resolveExtendedFieldFilters(
      [{ label: 'Priority', value: 'high' }],
      [{ templateId: 'tmpl-x', templateVersion: 1, fieldDefinitions: undefined }]
    );

    expect(result).toEqual([[]]);
  });

  it('groups multiple storage keys under one label when different templates share the same label but different names', () => {
    // "Estimate" appears in two templates with different field names.
    // Searching by "Estimate" should OR both storage keys so all three cases are returned.
    const result = resolveExtendedFieldFilters(
      [{ label: 'Estimate', value: '3' }],
      [
        {
          templateId: 'tmpl-x',
          templateVersion: 1,
          fieldDefinitions: [
            { name: 'effort', label: 'Estimate', type: 'integer', control: 'INPUT_NUMBER' },
          ],
        },
        {
          templateId: 'tmpl-y',
          templateVersion: 1,
          fieldDefinitions: [
            { name: 'story_points', label: 'Estimate', type: 'integer', control: 'INPUT_NUMBER' },
          ],
        },
        {
          templateId: 'tmpl-z',
          templateVersion: 1,
          fieldDefinitions: [
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
          templateVersions: expect.arrayContaining([
            { id: 'tmpl-x', version: 1 },
            { id: 'tmpl-z', version: 1 },
          ]),
        }),
        expect.objectContaining({
          storageKey: 'story_points_as_integer',
          templateVersions: [{ id: 'tmpl-y', version: 1 }],
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
          templateVersion: 1,
          fieldDefinitions: [
            { name: 'prio', label: 'Priority', type: 'keyword', control: 'SELECT_BASIC' },
          ],
        },
        {
          templateId: 'tmpl-2',
          templateVersion: 1,
          fieldDefinitions: [
            { name: 'prio', label: 'Priority', type: 'keyword', control: 'SELECT_BASIC' },
          ],
        },
      ]
    );

    expect(result).toEqual([
      [
        expect.objectContaining({
          storageKey: 'prio_as_keyword',
          templateVersions: expect.arrayContaining([
            { id: 'tmpl-1', version: 1 },
            { id: 'tmpl-2', version: 1 },
          ]),
        }),
      ],
    ]);
  });

  it('resolves a label that only exists on a global field', () => {
    const result = resolveExtendedFieldFilters(
      [{ label: 'Team', value: 'soc' }],
      [],
      [
        {
          name: 'team',
          label: 'Team',
          type: 'keyword',
          control: 'INPUT_TEXT',
        },
      ]
    );

    expect(result).toEqual([
      [
        expect.objectContaining({
          storageKey: 'team_as_keyword',
          value: 'soc',
          control: 'INPUT_TEXT',
          isGlobal: true,
          templateVersions: [],
        }),
      ],
    ]);
  });

  it('ORs template and global storage keys when the same label exists on both', () => {
    const result = resolveExtendedFieldFilters([{ label: 'Priority', value: 'high' }], templates, [
      {
        name: 'global_priority',
        label: 'Priority',
        type: 'keyword',
        control: 'INPUT_TEXT',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ storageKey: 'priority_as_keyword', isGlobal: undefined }),
        expect.objectContaining({
          storageKey: 'global_priority_as_keyword',
          isGlobal: true,
          templateVersions: [],
        }),
      ])
    );
  });

  it('filters by specific template versions when same template ID has different field definitions', () => {
    const templatesWithVersionedFields = [
      {
        templateId: 'incident-template',
        templateVersion: 1,
        fieldDefinitions: [
          {
            name: 'effort_estimate',
            label: 'Effort Estimate',
            type: 'long',
            control: 'INPUT_NUMBER',
          },
        ],
      },
      {
        templateId: 'incident-template',
        templateVersion: 2,
        fieldDefinitions: [
          { name: 'some_estimate', label: 'Some Estimate', type: 'long', control: 'INPUT_NUMBER' },
        ],
      },
    ];

    const result = resolveExtendedFieldFilters(
      [{ label: 'Effort Estimate', value: '5' }],
      templatesWithVersionedFields
    );

    expect(result).toEqual([
      [
        {
          storageKey: 'effort_estimate_as_long',
          value: '5',
          esType: 'long',
          control: 'INPUT_NUMBER',
          templateVersions: [{ id: 'incident-template', version: 1 }],
        },
      ],
    ]);
  });

  it('includes all template versions that have the requested field', () => {
    const templatesWithSameFieldAcrossVersions = [
      {
        templateId: 'incident-template',
        templateVersion: 1,
        fieldDefinitions: [
          { name: 'priority', label: 'Priority', type: 'keyword', control: 'SELECT' },
        ],
      },
      {
        templateId: 'incident-template',
        templateVersion: 2,
        fieldDefinitions: [
          { name: 'priority', label: 'Priority', type: 'keyword', control: 'SELECT' },
        ],
      },
      {
        templateId: 'incident-template',
        templateVersion: 3,
        fieldDefinitions: [
          { name: 'severity', label: 'Severity', type: 'keyword', control: 'SELECT' },
        ],
      },
    ];

    const result = resolveExtendedFieldFilters(
      [{ label: 'Priority', value: 'high' }],
      templatesWithSameFieldAcrossVersions
    );

    expect(result).toEqual([
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT',
          templateVersions: [
            { id: 'incident-template', version: 1 },
            { id: 'incident-template', version: 2 },
          ],
        },
      ],
    ]);
  });
});

describe('parseDateFilterToRange', () => {
  it('parses YYYY-MM-DD to a full-day range with bare-date bounds', () => {
    expect(parseDateFilterToRange('2024-01-01')).toEqual({
      gte: '2024-01-01',
      lt: '2024-01-02',
    });
  });

  it('parses ISO 8601 string by truncating to the day', () => {
    expect(parseDateFilterToRange('2024-01-01T00:00:00.000Z')).toEqual({
      gte: '2024-01-01',
      lt: '2024-01-02',
    });
  });

  it('returns bare-date bounds that lexicographically bracket a full ISO timestamp stored for the same day', () => {
    // The flattened/keyword field can hold either a bare date or a full ISO timestamp
    // depending on how the value was stored, and range queries on it compare lexicographically.
    // A full-ISO `gte` bound (e.g. "2024-01-01T00:00:00.000Z") would sort *after* a bare-date
    // stored value ("2024-01-01") and never match it. Bare-date bounds match both.
    const { gte, lt } = parseDateFilterToRange('2024-01-01')!;
    expect('2024-01-01' >= gte && '2024-01-01' < lt).toBe(true);
    expect('2024-01-01T13:45:00.000Z' >= gte && '2024-01-01T13:45:00.000Z' < lt).toBe(true);
    expect('2024-01-02T00:00:00.000Z' >= gte && '2024-01-02T00:00:00.000Z' < lt).toBe(false);
  });

  it('returns undefined for unrecognised formats', () => {
    expect(parseDateFilterToRange('not-a-date')).toBeUndefined();
    expect(parseDateFilterToRange('')).toBeUndefined();
    expect(parseDateFilterToRange('2024/01/01')).toBeUndefined();
  });

  it('returns undefined for MM/DD/YYYY format (only ISO accepted)', () => {
    expect(parseDateFilterToRange('01/01/2024')).toBeUndefined();
    expect(parseDateFilterToRange('12/31/2024')).toBeUndefined();
  });

  it('returns undefined for out-of-range month or day in ISO format', () => {
    expect(parseDateFilterToRange('2024-13-01')).toBeUndefined();
    expect(parseDateFilterToRange('2024-00-01')).toBeUndefined();
  });

  it('returns undefined for invalid day-of-month in February (non-leap year)', () => {
    expect(parseDateFilterToRange('2023-02-29')).toBeUndefined();
    expect(parseDateFilterToRange('2023-02-30')).toBeUndefined();
  });

  it('returns undefined for invalid day-of-month in February (leap year)', () => {
    expect(parseDateFilterToRange('2024-02-30')).toBeUndefined();
  });

  it('accepts valid leap day in February (leap year)', () => {
    expect(parseDateFilterToRange('2024-02-29')).toEqual({
      gte: '2024-02-29',
      lt: '2024-03-01',
    });
  });

  it('returns undefined for invalid day-of-month in 30-day months', () => {
    expect(parseDateFilterToRange('2024-04-31')).toBeUndefined();
    expect(parseDateFilterToRange('2024-06-31')).toBeUndefined();
    expect(parseDateFilterToRange('2024-09-31')).toBeUndefined();
    expect(parseDateFilterToRange('2024-11-31')).toBeUndefined();
  });

  it('accepts valid last day of 30-day months', () => {
    expect(parseDateFilterToRange('2024-04-30')).toEqual({
      gte: '2024-04-30',
      lt: '2024-05-01',
    });
    expect(parseDateFilterToRange('2024-11-30')).toEqual({
      gte: '2024-11-30',
      lt: '2024-12-01',
    });
  });

  it('accepts valid day 31 in 31-day months', () => {
    expect(parseDateFilterToRange('2024-01-31')).toEqual({
      gte: '2024-01-31',
      lt: '2024-02-01',
    });
    expect(parseDateFilterToRange('2024-12-31')).toEqual({
      gte: '2024-12-31',
      lt: '2025-01-01',
    });
  });
});

describe('buildExtendedFieldRuntimeMappings', () => {
  it('skips runtime mapping for SELECT_BASIC (uses flattened field directly)', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(mappings).toEqual({});
  });

  it('builds long runtime field for integer type', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'effort_as_integer',
          value: '5',
          esType: 'integer',
          control: 'INPUT_NUMBER',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
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
          templateVersions: [{ id: 'tmpl-b', version: 1 }],
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

  it('skips runtime mapping for DATE_PICKER (uses flattened field directly)', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'due_date_as_date',
          value: '2025-01-01',
          esType: 'date',
          control: 'DATE_PICKER',
          templateVersions: [{ id: 'tmpl-b', version: 1 }],
        },
      ],
    ]);

    expect(mappings).toEqual({});
  });

  it('builds USER_PICKER runtime field that extracts name values from {uid,name} objects', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'reviewers_as_keyword',
          value: 'elastic',
          esType: 'keyword',
          control: 'USER_PICKER',
          templateVersions: [{ id: 'tmpl-c', version: 1 }],
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
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
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

  it('only builds runtime fields for controls that need scripts, skips flattened-optimizable controls', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
      [
        {
          storageKey: 'effort_as_integer',
          value: '5',
          esType: 'integer',
          control: 'INPUT_NUMBER',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(Object.keys(mappings)).toEqual(['ef_effort_as_integer']);
  });

  it('builds runtime mapping for INPUT_TEXT (needs substring matching)', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'summary_as_keyword',
          value: 'test',
          esType: 'keyword',
          control: 'INPUT_TEXT',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(mappings).toHaveProperty('ef_summary_as_keyword');
    expect(mappings.ef_summary_as_keyword.type).toBe('keyword');
    const summaryScript = mappings.ef_summary_as_keyword.script;
    const summarySource =
      typeof summaryScript === 'object' && summaryScript != null && 'source' in summaryScript
        ? String(summaryScript.source)
        : String(summaryScript ?? '');
    expect(summarySource).toContain('emit(raw);');
    expect(summarySource).not.toContain("raw.startsWith('[')");
  });

  it('builds runtime mapping for TEXTAREA (needs substring matching)', () => {
    const mappings = buildExtendedFieldRuntimeMappings([
      [
        {
          storageKey: 'notes_as_keyword',
          value: 'deploy',
          esType: 'keyword',
          control: 'TEXTAREA',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(mappings).toHaveProperty('ef_notes_as_keyword');
    expect(mappings.ef_notes_as_keyword.type).toBe('keyword');
    const notesScript = mappings.ef_notes_as_keyword.script;
    const notesSource =
      typeof notesScript === 'object' && notesScript != null && 'source' in notesScript
        ? String(notesScript.source)
        : String(notesScript ?? '');
    expect(notesSource).toContain('emit(raw);');
    expect(notesSource).not.toContain("raw.startsWith('[')");
  });
});

describe('buildExtendedFieldFilterClauses', () => {
  it('builds a scoped bool.filter clause for a single keyword field using flattened path', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            { term: { 'cases.extended_fields.priority_as_keyword': 'high' } },
            {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    bool: {
                      must: [
                        {
                          term: {
                            'cases.template.id': 'tmpl-a',
                          },
                        },
                        {
                          term: {
                            'cases.template.version': 1,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
  });

  it('omits the template version filter for global fields', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'team_as_keyword',
          value: 'soc',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateVersions: [],
          isGlobal: true,
        },
      ],
    ]);

    expect(clauses).toEqual([{ term: { 'cases.extended_fields.team_as_keyword': 'soc' } }]);
  });

  it('builds wildcard query for INPUT_TEXT control via runtime field', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'summary_as_keyword',
          value: 'some changes',
          esType: 'keyword',
          control: 'INPUT_TEXT',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(clauses[0]?.bool?.filter).toBeDefined();
    const filterArray = clauses[0]!.bool!.filter as estypes.QueryDslQueryContainer[];
    expect(filterArray[0]).toEqual({
      wildcard: {
        ef_summary_as_keyword: {
          value: '*some changes*',
          case_insensitive: true,
        },
      },
    });
  });

  it('builds wildcard query for TEXTAREA control via runtime field', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'notes_as_keyword',
          value: 'deploy',
          esType: 'keyword',
          control: 'TEXTAREA',
          templateVersions: [{ id: 'tmpl-b', version: 1 }],
        },
      ],
    ]);

    expect(clauses[0]?.bool?.filter).toBeDefined();
    const filterArray = clauses[0]!.bool!.filter as estypes.QueryDslQueryContainer[];
    expect(filterArray[0]).toEqual({
      wildcard: {
        ef_notes_as_keyword: {
          value: '*deploy*',
          case_insensitive: true,
        },
      },
    });
  });

  it('escapes wildcard characters in INPUT_TEXT filter value', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'summary_as_keyword',
          value: 'test*value?here',
          esType: 'keyword',
          control: 'INPUT_TEXT',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    const filterArray = clauses[0]!.bool!.filter as estypes.QueryDslQueryContainer[];
    expect(filterArray[0]).toEqual({
      wildcard: {
        ef_summary_as_keyword: {
          value: '*test\\*value\\?here*',
          case_insensitive: true,
        },
      },
    });
  });

  it('builds term queries with numeric value for integer fields', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'effort_as_integer',
          value: '5',
          esType: 'integer',
          control: 'INPUT_NUMBER',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            { term: { ef_effort_as_integer: { value: 5 } } },
            {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    bool: {
                      must: [
                        {
                          term: {
                            'cases.template.id': 'tmpl-a',
                          },
                        },
                        {
                          term: {
                            'cases.template.version': 1,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
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
          templateVersions: [{ id: 'tmpl-b', version: 1 }],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            { term: { ef_score_as_double: { value: 3.5 } } },
            {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    bool: {
                      must: [
                        {
                          term: {
                            'cases.template.id': 'tmpl-b',
                          },
                        },
                        {
                          term: {
                            'cases.template.version': 1,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
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
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            { term: { ef_components_as_keyword: { value: 'api' } } },
            {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    bool: {
                      must: [
                        {
                          term: {
                            'cases.template.id': 'tmpl-a',
                          },
                        },
                        {
                          term: {
                            'cases.template.version': 1,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
  });

  it('returns match_none for DATE_PICKER filter when value is MM/DD/YYYY (non-ISO)', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'start_date_as_date',
          value: '01/01/2024',
          esType: 'date',
          control: 'DATE_PICKER',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(clauses).toEqual([{ match_none: {} }]);
  });

  it('builds range query for DATE_PICKER using YYYY-MM-DD input on flattened path', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'start_date_as_date',
          value: '2024-01-01',
          esType: 'date',
          control: 'DATE_PICKER',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            {
              range: {
                'cases.extended_fields.start_date_as_date': {
                  gte: '2024-01-01',
                  lt: '2024-01-02',
                },
              },
            },
            {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    bool: {
                      must: [
                        {
                          term: {
                            'cases.template.id': 'tmpl-a',
                          },
                        },
                        {
                          term: {
                            'cases.template.version': 1,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
  });

  it('returns match_none for DATE_PICKER filter when the date value cannot be parsed', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'start_date_as_date',
          value: 'not-a-date',
          esType: 'date',
          control: 'DATE_PICKER',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(clauses).toEqual([{ match_none: {} }]);
  });

  it('returns match_none for numeric filter when value is not a valid number', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'story_points_as_long',
          value: 'high',
          esType: 'long',
          control: 'INPUT_NUMBER',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(clauses).toEqual([{ match_none: {} }]);
  });

  it('returns match_none for double filter when value is not a valid number', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'effort_estimate_as_double',
          value: 'invalid',
          esType: 'double',
          control: 'INPUT_NUMBER',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    expect(clauses).toEqual([{ match_none: {} }]);
  });

  it('returns match_none for an empty group (unresolved label)', () => {
    const clauses = buildExtendedFieldFilterClauses([[]]);

    expect(clauses).toEqual([{ match_none: {} }]);
  });

  it('builds term query for USER_PICKER (runtime field emits name values from {uid,name} objects)', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'reviewers_as_keyword',
          value: 'elastic',
          esType: 'keyword',
          control: 'USER_PICKER',
          templateVersions: [{ id: 'tmpl-c', version: 1 }],
        },
      ],
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            { term: { ef_reviewers_as_keyword: { value: 'elastic' } } },
            {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    bool: {
                      must: [
                        {
                          term: {
                            'cases.template.id': 'tmpl-c',
                          },
                        },
                        {
                          term: {
                            'cases.template.version': 1,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
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
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
      [
        {
          storageKey: 'region_as_keyword',
          value: 'emea',
          esType: 'keyword',
          control: 'SELECT_BASIC',
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    // Two separate filter clauses — query builder wraps them in bool.filter (AND)
    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toEqual({
      bool: {
        filter: [
          { term: { 'cases.extended_fields.priority_as_keyword': 'high' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  bool: {
                    must: [
                      {
                        term: {
                          'cases.template.id': 'tmpl-a',
                        },
                      },
                      {
                        term: {
                          'cases.template.version': 1,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
    expect(clauses[1]).toEqual({
      bool: {
        filter: [
          { term: { 'cases.extended_fields.region_as_keyword': 'emea' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  bool: {
                    must: [
                      {
                        term: {
                          'cases.template.id': 'tmpl-a',
                        },
                      },
                      {
                        term: {
                          'cases.template.version': 1,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
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
          templateVersions: [
            { id: 'tmpl-x', version: 1 },
            { id: 'tmpl-z', version: 1 },
          ],
        },
        {
          storageKey: 'story_points_as_integer',
          value: '3',
          esType: 'integer',
          control: 'INPUT_NUMBER',
          templateVersions: [{ id: 'tmpl-y', version: 1 }],
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
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          bool: {
                            must: [
                              {
                                term: {
                                  'cases.template.id': 'tmpl-x',
                                },
                              },
                              {
                                term: {
                                  'cases.template.version': 1,
                                },
                              },
                            ],
                          },
                        },
                        {
                          bool: {
                            must: [
                              {
                                term: {
                                  'cases.template.id': 'tmpl-z',
                                },
                              },
                              {
                                term: {
                                  'cases.template.version': 1,
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              bool: {
                filter: [
                  { term: { ef_story_points_as_integer: { value: 3 } } },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          bool: {
                            must: [
                              {
                                term: {
                                  'cases.template.id': 'tmpl-y',
                                },
                              },
                              {
                                term: {
                                  'cases.template.version': 1,
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
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
          templateVersions: [{ id: 'tmpl-a', version: 1 }],
        },
      ],
    ]);

    // Single entry — no should wrapper
    expect(clauses[0]).not.toHaveProperty('bool.should');
    expect(clauses[0]).toEqual({
      bool: {
        filter: [
          { term: { 'cases.extended_fields.priority_as_keyword': 'high' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  bool: {
                    must: [
                      {
                        term: {
                          'cases.template.id': 'tmpl-a',
                        },
                      },
                      {
                        term: {
                          'cases.template.version': 1,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it('builds ES query that filters by both template ID and version', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'effort_estimate_as_long',
          value: '5',
          esType: 'long',
          control: 'INPUT_NUMBER',
          templateVersions: [{ id: 'incident-template', version: 1 }],
        },
      ],
    ]);

    expect(clauses).toHaveLength(1);
    const clause = clauses[0];

    expect(clause).toEqual({
      bool: {
        filter: [
          { term: { ef_effort_estimate_as_long: { value: 5 } } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  bool: {
                    must: [
                      { term: { 'cases.template.id': 'incident-template' } },
                      { term: { 'cases.template.version': 1 } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it('builds ES query with multiple template versions using OR logic', () => {
    const clauses = buildExtendedFieldFilterClauses([
      [
        {
          storageKey: 'priority_as_keyword',
          value: 'high',
          esType: 'keyword',
          control: 'SELECT',
          templateVersions: [
            { id: 'incident-template', version: 1 },
            { id: 'incident-template', version: 2 },
            { id: 'alert-template', version: 1 },
          ],
        },
      ],
    ]);

    expect(clauses).toHaveLength(1);
    const clause = clauses[0];
    expect(clause?.bool?.filter).toBeDefined();

    const filterArray = clause!.bool!.filter as estypes.QueryDslQueryContainer[];
    // SELECT control uses flattened path
    expect(filterArray[0]).toEqual({
      term: { 'cases.extended_fields.priority_as_keyword': 'high' },
    });

    const templateFilter = filterArray[1] as {
      bool?: { should?: unknown[]; minimum_should_match?: number };
    };

    expect(templateFilter?.bool?.should).toHaveLength(3);
    expect(templateFilter?.bool?.minimum_should_match).toBe(1);
    expect(templateFilter?.bool?.should).toEqual([
      {
        bool: {
          must: [
            { term: { 'cases.template.id': 'incident-template' } },
            { term: { 'cases.template.version': 1 } },
          ],
        },
      },
      {
        bool: {
          must: [
            { term: { 'cases.template.id': 'incident-template' } },
            { term: { 'cases.template.version': 2 } },
          ],
        },
      },
      {
        bool: {
          must: [
            { term: { 'cases.template.id': 'alert-template' } },
            { term: { 'cases.template.version': 1 } },
          ],
        },
      },
    ]);
  });
});

describe('tokenizeSearchForLabels', () => {
  it('splits bare words into exact tokens', () => {
    expect(tokenizeSearchForLabels('priority region')).toEqual([
      { text: 'priority', exact: true },
      { text: 'region', exact: true },
    ]);
  });

  it('extracts quoted phrases as substring tokens', () => {
    expect(tokenizeSearchForLabels('"Start date"')).toEqual([{ text: 'start date', exact: false }]);
  });

  it('handles mixed quoted and bare tokens (quoted extracted first)', () => {
    expect(tokenizeSearchForLabels('priority "Start date" region')).toEqual([
      { text: 'start date', exact: false },
      { text: 'priority', exact: true },
      { text: 'region', exact: true },
    ]);
  });

  it('lowercases all tokens', () => {
    expect(tokenizeSearchForLabels('Priority "Effort Level"')).toEqual([
      { text: 'effort level', exact: false },
      { text: 'priority', exact: true },
    ]);
  });

  it('returns empty array for empty string', () => {
    expect(tokenizeSearchForLabels('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(tokenizeSearchForLabels('   ')).toEqual([]);
  });

  it('ignores empty quoted strings', () => {
    expect(tokenizeSearchForLabels('"" priority')).toEqual([{ text: 'priority', exact: true }]);
  });

  it('trims whitespace inside quoted strings', () => {
    expect(tokenizeSearchForLabels('"  Start date  "')).toEqual([
      { text: 'start date', exact: false },
    ]);
  });
});

describe('resolveFieldLabelSearch', () => {
  const templates = [
    {
      templateId: 'tmpl-a',
      templateVersion: 1,
      fieldDefinitions: [
        { name: 'priority', label: 'Priority', type: 'keyword', control: 'SELECT_BASIC' },
        { name: 'region', label: 'Region', type: 'keyword', control: 'SELECT_BASIC' },
        {
          name: 'start_date',
          label: 'Start date operation',
          type: 'date',
          control: 'DATE_PICKER',
        },
        {
          name: 'end_date',
          label: 'End date',
          type: 'date',
          control: 'DATE_PICKER',
        },
      ],
    },
    {
      templateId: 'tmpl-b',
      templateVersion: 1,
      fieldDefinitions: [
        {
          name: 'start_security',
          label: 'Start date security',
          type: 'date',
          control: 'DATE_PICKER',
        },
      ],
    },
  ];

  it('resolves bare word to matching full label', () => {
    const result = resolveFieldLabelSearch([{ text: 'priority', exact: true }], templates);

    expect(result).toEqual([
      {
        storageKey: 'priority_as_keyword',
        esType: 'keyword',
        control: 'SELECT_BASIC',
        templateVersions: [{ id: 'tmpl-a', version: 1 }],
      },
    ]);
  });

  it('exact token does not substring-match partial labels', () => {
    const result = resolveFieldLabelSearch([{ text: 'start', exact: true }], templates);

    expect(result).toEqual([]);
  });

  it('substring token matches partial labels', () => {
    const result = resolveFieldLabelSearch([{ text: 'start', exact: false }], templates);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ storageKey: 'start_date_as_date' }),
        expect.objectContaining({ storageKey: 'start_security_as_date' }),
      ])
    );
  });

  it('matches quoted substring token against labels containing the text', () => {
    const result = resolveFieldLabelSearch([{ text: 'start date', exact: false }], templates);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ storageKey: 'start_date_as_date' }),
        expect.objectContaining({ storageKey: 'start_security_as_date' }),
      ])
    );
  });

  it('does not match quoted substring that does not appear in any label', () => {
    const result = resolveFieldLabelSearch(
      [{ text: 'nonexistent field', exact: false }],
      templates
    );

    expect(result).toEqual([]);
  });

  it('quoted "start date" matches "Start date operation" and "Start date security" but not "End date"', () => {
    const result = resolveFieldLabelSearch([{ text: 'start date', exact: false }], templates);

    const storageKeys = result.map((r) => r.storageKey);
    expect(storageKeys).toContain('start_date_as_date');
    expect(storageKeys).toContain('start_security_as_date');
    expect(storageKeys).not.toContain('end_date_as_date');
  });

  it('deduplicates storage keys across multiple tokens', () => {
    const result = resolveFieldLabelSearch(
      [
        { text: 'priority', exact: true },
        { text: 'priority', exact: true },
      ],
      templates
    );

    expect(result).toHaveLength(1);
  });

  it('returns empty for empty tokens', () => {
    expect(resolveFieldLabelSearch([], templates)).toEqual([]);
  });

  it('returns empty for empty templates', () => {
    expect(resolveFieldLabelSearch([{ text: 'priority', exact: true }], [])).toEqual([]);
  });

  it('is case-insensitive for label matching', () => {
    const result = resolveFieldLabelSearch([{ text: 'PRIORITY', exact: true }], templates);

    expect(result).toEqual([expect.objectContaining({ storageKey: 'priority_as_keyword' })]);
  });
});

describe('buildFieldLabelRuntimeMappings', () => {
  it('skips runtime mappings for controls that use flattened field directly', () => {
    const mappings = buildFieldLabelRuntimeMappings([
      {
        storageKey: 'priority_as_keyword',
        esType: 'keyword',
        control: 'SELECT_BASIC',
        templateVersions: [{ id: 'tmpl-a', version: 1 }],
      },
    ]);

    expect(mappings).toEqual({});
  });

  it('skips runtime mapping for DATE_PICKER (uses flattened field directly)', () => {
    const mappings = buildFieldLabelRuntimeMappings([
      {
        storageKey: 'start_date_as_date',
        esType: 'date',
        control: 'DATE_PICKER',
        templateVersions: [{ id: 'tmpl-a', version: 1 }],
      },
    ]);

    expect(mappings).toEqual({});
  });

  it('builds runtime mappings for CHECKBOX_GROUP', () => {
    const mappings = buildFieldLabelRuntimeMappings([
      {
        storageKey: 'components_as_keyword',
        esType: 'keyword',
        control: 'CHECKBOX_GROUP',
        templateVersions: [{ id: 'tmpl-a', version: 1 }],
      },
    ]);

    expect(mappings).toHaveProperty('ef_components_as_keyword');
    expect(mappings.ef_components_as_keyword.type).toBe('keyword');
  });

  it('builds runtime mappings for USER_PICKER', () => {
    const mappings = buildFieldLabelRuntimeMappings([
      {
        storageKey: 'reviewers_as_keyword',
        esType: 'keyword',
        control: 'USER_PICKER',
        templateVersions: [{ id: 'tmpl-c', version: 1 }],
      },
    ]);

    expect(mappings).toHaveProperty('ef_reviewers_as_keyword');
  });
});

describe('buildFieldLabelExistsClauses', () => {
  it('builds exists clause on flattened path for non-script controls', () => {
    const clauses = buildFieldLabelExistsClauses([
      {
        storageKey: 'priority_as_keyword',
        esType: 'keyword',
        control: 'SELECT_BASIC',
        templateVersions: [{ id: 'tmpl-a', version: 1 }],
      },
    ]);

    expect(clauses).toEqual([
      {
        bool: {
          filter: [
            { exists: { field: 'cases.extended_fields.priority_as_keyword' } },
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [
                        { term: { 'cases.template.id': 'tmpl-a' } },
                        { term: { 'cases.template.version': 1 } },
                      ],
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    ]);
  });

  it('builds exists clause on runtime field for script-required controls', () => {
    const clauses = buildFieldLabelExistsClauses([
      {
        storageKey: 'components_as_keyword',
        esType: 'keyword',
        control: 'CHECKBOX_GROUP',
        templateVersions: [{ id: 'tmpl-a', version: 1 }],
      },
    ]);

    expect(clauses[0]).toHaveProperty('bool.filter.0.exists.field', 'ef_components_as_keyword');
  });

  it('builds multiple clauses for multiple label filters using correct field paths', () => {
    const clauses = buildFieldLabelExistsClauses([
      {
        storageKey: 'priority_as_keyword',
        esType: 'keyword',
        control: 'SELECT_BASIC',
        templateVersions: [{ id: 'tmpl-a', version: 1 }],
      },
      {
        storageKey: 'region_as_keyword',
        esType: 'keyword',
        control: 'SELECT_BASIC',
        templateVersions: [{ id: 'tmpl-a', version: 1 }],
      },
    ]);

    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toHaveProperty(
      'bool.filter.0.exists.field',
      'cases.extended_fields.priority_as_keyword'
    );
    expect(clauses[1]).toHaveProperty(
      'bool.filter.0.exists.field',
      'cases.extended_fields.region_as_keyword'
    );
  });

  it('includes multiple template versions in OR logic', () => {
    const clauses = buildFieldLabelExistsClauses([
      {
        storageKey: 'priority_as_keyword',
        esType: 'keyword',
        control: 'SELECT_BASIC',
        templateVersions: [
          { id: 'tmpl-a', version: 1 },
          { id: 'tmpl-a', version: 2 },
        ],
      },
    ]);

    const filterArray = clauses[0]?.bool?.filter as estypes.QueryDslQueryContainer[];
    const shouldClauses = filterArray[1]?.bool?.should as
      | estypes.QueryDslQueryContainer[]
      | undefined;
    expect(shouldClauses).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(buildFieldLabelExistsClauses([])).toEqual([]);
  });

  it('omits the template version filter for global fields', () => {
    const clauses = buildFieldLabelExistsClauses([
      {
        storageKey: 'team_as_keyword',
        esType: 'keyword',
        control: 'INPUT_TEXT',
        templateVersions: [],
        isGlobal: true,
      },
    ]);

    // Must be a bare exists clause — ANDing an empty template-version filter
    // (`{ bool: { should: [], minimum_should_match: 1 } }`) would be unsatisfiable
    // and silently match zero cases.
    expect(clauses).toEqual([{ exists: { field: 'ef_team_as_keyword' } }]);
  });
});

describe('buildAllExtendedFieldValuesRuntimeMapping', () => {
  it('returns a mapping with the ef_all_values field', () => {
    const mappings = buildAllExtendedFieldValuesRuntimeMapping();

    expect(mappings).toHaveProperty([EF_ALL_VALUES_FIELD]);
    expect(mappings[EF_ALL_VALUES_FIELD].type).toBe('keyword');
  });

  it('generates a Painless script that reads from _source', () => {
    const mappings = buildAllExtendedFieldValuesRuntimeMapping();
    const src = (mappings[EF_ALL_VALUES_FIELD].script as { source: string })?.source ?? '';

    expect(src).toContain('params._source');
  });

  it('generates a Painless script that iterates extended_fields entries', () => {
    const mappings = buildAllExtendedFieldValuesRuntimeMapping();
    const src = (mappings[EF_ALL_VALUES_FIELD].script as { source: string })?.source ?? '';

    expect(src).toContain('ef.entrySet()');
    expect(src).toContain('extended_fields');
  });

  it('generates a Painless script that lowercases and splits on whitespace', () => {
    const mappings = buildAllExtendedFieldValuesRuntimeMapping();
    const src = (mappings[EF_ALL_VALUES_FIELD].script as { source: string })?.source ?? '';

    expect(src).toContain('toLowerCase(Locale.ROOT)');
    expect(src).toContain('emit(t)');
  });

  it('generates a Painless script that strips JSON punctuation', () => {
    const mappings = buildAllExtendedFieldValuesRuntimeMapping();
    const src = (mappings[EF_ALL_VALUES_FIELD].script as { source: string })?.source ?? '';

    expect(src).toContain('replaceAll');
  });

  it('does not use optional chaining (?.) in the Painless script', () => {
    const mappings = buildAllExtendedFieldValuesRuntimeMapping();
    const src = (mappings[EF_ALL_VALUES_FIELD].script as { source: string })?.source ?? '';

    expect(src).not.toContain('?.');
  });

  it('extracts USER_PICKER names via regex before falling back to tokenization', () => {
    const mappings = buildAllExtendedFieldValuesRuntimeMapping();
    const src = (mappings[EF_ALL_VALUES_FIELD].script as { source: string })?.source ?? '';

    expect(src).toContain('"name":"([^"]*)"');
  });

  it('uses = as a word separator in the fallback tokenization', () => {
    const mappings = buildAllExtendedFieldValuesRuntimeMapping();
    const src = (mappings[EF_ALL_VALUES_FIELD].script as { source: string })?.source ?? '';

    expect(src).toContain('\\s,=');
  });

  it('guards against non-Map ef values with instanceof check', () => {
    const mappings = buildAllExtendedFieldValuesRuntimeMapping();
    const src = (mappings[EF_ALL_VALUES_FIELD].script as { source: string })?.source ?? '';

    expect(src).toContain('instanceof Map');
  });
});
