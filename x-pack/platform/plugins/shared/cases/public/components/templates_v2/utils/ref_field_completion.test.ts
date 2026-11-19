/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import { buildRefFieldSuggestions, getRefCompletionContext } from './ref_field_completion';

describe('getRefCompletionContext', () => {
  it('matches a $ref line with no partial typed yet', () => {
    // "  - $ref: " → cursor at column 11
    const context = getRefCompletionContext('  - $ref: ', 11);
    expect(context).toEqual({ replaceStartColumn: 11, replaceEndColumn: 11 });
  });

  it('replaces the partial already typed after $ref:', () => {
    // "  - $ref: roo" → cursor at column 14, partial "roo" (3 chars)
    const context = getRefCompletionContext('  - $ref: roo', 14);
    expect(context).toEqual({ replaceStartColumn: 11, replaceEndColumn: 14 });
  });

  it('matches a $ref key without a sequence dash', () => {
    const context = getRefCompletionContext('    $ref: r', 12);
    expect(context).toEqual({ replaceStartColumn: 11, replaceEndColumn: 12 });
  });

  it('returns null when the line is not a $ref value position', () => {
    expect(getRefCompletionContext('  - name: foo', 14)).toBeNull();
    expect(getRefCompletionContext('  control: INPUT_TEXT', 22)).toBeNull();
    expect(getRefCompletionContext('', 1)).toBeNull();
  });
});

describe('buildRefFieldSuggestions', () => {
  const makeFieldDefinition = (overrides: Partial<FieldDefinition>): FieldDefinition => ({
    fieldDefinitionId: 'id',
    name: 'root_cause',
    definition: 'name: root_cause',
    owner: 'securitySolution',
    ...overrides,
  });

  it('maps field definitions to suggestions with descriptions', () => {
    const suggestions = buildRefFieldSuggestions([
      makeFieldDefinition({ name: 'root_cause', description: 'Why it happened' }),
    ]);

    expect(suggestions).toEqual([
      { name: 'root_cause', detail: 'Field library reference', description: 'Why it happened' },
    ]);
  });

  it('labels global fields distinctly', () => {
    const suggestions = buildRefFieldSuggestions([
      makeFieldDefinition({ name: 'sla_breached', isGlobal: true }),
    ]);

    expect(suggestions[0].detail).toBe('Global field');
  });

  it('returns an empty list when there are no field definitions', () => {
    expect(buildRefFieldSuggestions([])).toEqual([]);
  });
});
