/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogueNamedFieldDefinition } from '@kbn/streams-schema';
import { validateValues } from './client_validation';
import { addFieldsDefinition, testCatalogue } from './test_helpers';

const context = { metadata: testCatalogue.metadata, telemetry: ['logs' as const] };

describe('validateValues', () => {
  const { fields } = addFieldsDefinition();

  it('accepts a complete add_fields configuration', () => {
    expect(
      validateValues(
        fields,
        { fields: [{ location: 'attributes', path: 'team', action: 'upsert', value: 'core' }] },
        context
      )
    ).toEqual({});
  });

  it('reports the required array and its min_items', () => {
    expect(validateValues(fields, {}, context)).toEqual({ '/fields': 'This field is required' });
    expect(validateValues(fields, { fields: [] }, context)).toEqual({
      '/fields': 'This field is required',
    });
  });

  it('does not require a field that config outside the form supplies', () => {
    expect(validateValues(fields, {}, context, new Set(['fields']))).toEqual({});
    expect(
      validateValues(fields, { fields: [{ action: 'upsert' }] }, context, new Set(['fields']))
    ).not.toEqual({});
  });

  it('points at missing required fields inside items, including the chosen value source', () => {
    expect(
      validateValues(
        fields,
        { fields: [{ location: 'attributes', action: 'upsert', ottl_value: '' }] },
        context
      )
    ).toEqual({
      '/fields/0/path': 'This field is required',
      '/fields/0/ottl_value': 'This field is required',
    });
  });

  it('skips the value for delete actions', () => {
    expect(
      validateValues(
        fields,
        { fields: [{ location: 'attributes', path: 'old', action: 'delete' }] },
        context
      )
    ).toEqual({});
  });

  it('rejects enum values that are not offered for the telemetry', () => {
    expect(
      validateValues(
        fields,
        { fields: [{ context: 'span', path: 'name', action: 'upsert', value: 'x' }] },
        context
      )
    ).toEqual({ '/fields/0/context': 'Choose one of the available options' });
  });

  it('checks string, number and array constraints', () => {
    const custom: CatalogueNamedFieldDefinition[] = [
      { type: 'string', name: 'name', min_length: 3, pattern: '^[a-z]+$' },
      { type: 'integer', name: 'count', minimum: 1, maximum: 5 },
      { type: 'array', name: 'tags', items: { type: 'string' }, max_items: 1, unique_items: true },
    ];
    expect(validateValues(custom, { name: 'ab', count: 9, tags: ['a', 'b'] }, context)).toEqual({
      '/name': 'Enter at least 3 characters',
      '/count': 'Must be at most 5',
      '/tags': 'Add at most 1 item',
    });
    expect(validateValues(custom, { name: 'AB1', count: 1.5, tags: ['a', 'a'] }, context)).toEqual({
      '/name': 'Must match the pattern ^[a-z]+$',
      '/count': 'Enter a whole number',
      '/tags': 'Add at most 1 item',
    });
  });
});
