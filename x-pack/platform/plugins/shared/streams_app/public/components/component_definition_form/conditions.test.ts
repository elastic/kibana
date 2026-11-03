/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogueStringField } from '@kbn/streams-schema';
import { evaluateCondition, isFieldAvailable, isFieldRequired } from './conditions';

describe('evaluateCondition', () => {
  const scope = { action: 'upsert', tags: ['a', 'b'], nested: { mode: 'x' }, empty: null };

  it('compares values with eq and neq', () => {
    expect(evaluateCondition({ path: '/action', operator: 'eq', value: 'upsert' }, scope, [])).toBe(
      true
    );
    expect(
      evaluateCondition({ path: '/action', operator: 'neq', value: 'delete' }, scope, [])
    ).toBe(true);
  });

  it('treats missing and null values as not existing', () => {
    expect(evaluateCondition({ path: '/action', operator: 'exists' }, scope, [])).toBe(true);
    expect(evaluateCondition({ path: '/missing', operator: 'exists' }, scope, [])).toBe(false);
    expect(evaluateCondition({ path: '/empty', operator: 'exists' }, scope, [])).toBe(false);
  });

  it('checks contains on arrays and strings', () => {
    expect(evaluateCondition({ path: '/tags', operator: 'contains', value: 'b' }, scope, [])).toBe(
      true
    );
    expect(
      evaluateCondition({ path: '/action', operator: 'contains', value: 'ser' }, scope, [])
    ).toBe(true);
  });

  it('resolves nested pointers', () => {
    expect(evaluateCondition({ path: '/nested/mode', operator: 'eq', value: 'x' }, scope, [])).toBe(
      true
    );
  });

  it('combines conditions and checks telemetry', () => {
    const condition = {
      all: [
        { path: '/action', operator: 'eq' as const, value: 'upsert' },
        { not: { telemetry_contains: 'traces' as const } },
        {
          any: [{ telemetry_contains: 'logs' as const }, { telemetry_contains: 'docs' as const }],
        },
      ],
    };
    expect(evaluateCondition(condition, scope, ['logs'])).toBe(true);
    expect(evaluateCondition(condition, scope, ['logs', 'traces'])).toBe(false);
  });
});

describe('field availability and requirement', () => {
  const field: CatalogueStringField = {
    type: 'string',
    name: 'value',
    available_when: { path: '/action', operator: 'neq', value: 'delete' },
    required_when: { path: '/action', operator: 'eq', value: 'upsert' },
  };

  it('hides a field when available_when is false', () => {
    expect(isFieldAvailable(field, { action: 'delete' }, [])).toBe(false);
    expect(isFieldAvailable(field, { action: 'upsert' }, [])).toBe(true);
  });

  it('requires a field through required or required_when', () => {
    expect(isFieldRequired(field, { action: 'upsert' }, [])).toBe(true);
    expect(isFieldRequired(field, { action: 'insert' }, [])).toBe(false);
    expect(isFieldRequired({ ...field, required: true }, { action: 'insert' }, [])).toBe(true);
  });
});
