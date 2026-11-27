/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogueMapField, CatalogueNamedFieldDefinition } from '@kbn/streams-schema';
import { validateItemScopes, validateValues } from './client_validation';
import { definitionOf, testCatalogue, withItemTelemetry } from './test_helpers';

const context = { metadata: testCatalogue.metadata, telemetry: ['logs' as const] };

describe('validateValues', () => {
  const { fields } = definitionOf('set');
  const scopedFields = withItemTelemetry(definitionOf('set')).fields;
  const operation = { location: 'attributes', path: 'team', action: 'upsert', value: 'core' };

  it('accepts a complete set configuration', () => {
    expect(validateValues(fields, { operations: [operation] }, context)).toEqual({});
  });

  it('reports the required array and its min_items', () => {
    expect(validateValues(fields, {}, context)).toEqual({
      '/operations': 'This field is required',
    });
    expect(validateValues(fields, { operations: [] }, context)).toEqual({
      '/operations': 'This field is required',
    });
  });

  it('flags an item scoped to a signal the processor no longer applies to', () => {
    expect(
      validateValues(
        scopedFields,
        {
          operations: [
            { ...operation, telemetry: ['logs'] },
            { ...operation, telemetry: ['metrics'] },
          ],
        },
        context
      )
    ).toEqual({
      '/operations/1/telemetry':
        'Applies to signals this processor no longer handles. Change it or remove the item.',
    });
  });

  it('flags no item scopes while no signals are chosen', () => {
    expect(
      validateItemScopes(
        scopedFields,
        { operations: [{ ...operation, telemetry: ['metrics'] }] },
        { ...context, telemetry: [] }
      )
    ).toEqual({});
  });

  it('does not require a field that config outside the form supplies', () => {
    expect(validateValues(fields, {}, context, new Set(['operations']))).toEqual({});
    expect(
      validateValues(
        fields,
        { operations: [{ action: 'upsert' }] },
        context,
        new Set(['operations'])
      )
    ).not.toEqual({});
  });

  it('points at missing required fields inside items, including the chosen value source', () => {
    expect(
      validateValues(
        fields,
        { operations: [{ location: 'attributes', action: 'upsert', ottl_value: '' }] },
        context
      )
    ).toEqual({
      '/operations/0/path': 'This field is required',
      '/operations/0/ottl_value': 'This field is required',
    });
  });

  it('skips a required field while it is not available', () => {
    const conditional: CatalogueNamedFieldDefinition[] = [
      { name: 'action', type: 'enum', options: [{ value: 'upsert' }, { value: 'delete' }] },
      {
        name: 'value',
        type: 'string',
        required: true,
        available_when: { path: '/action', operator: 'neq', value: 'delete' },
      },
    ];
    expect(validateValues(conditional, { action: 'delete' }, context)).toEqual({});
    expect(validateValues(conditional, { action: 'upsert' }, context)).toEqual({
      '/value': 'This field is required',
    });
  });

  it('rejects enum values that are not offered for the telemetry', () => {
    expect(
      validateValues(
        fields,
        { operations: [{ context: 'span', path: 'name', action: 'upsert', value: 'x' }] },
        context
      )
    ).toEqual({ '/operations/0/context': 'Choose one of the available options' });
  });

  it('asks for every row of a list of plain values to be filled in or removed', () => {
    expect(
      validateValues(
        definitionOf('delete_fields').fields,
        { fields: [{ location: 'attributes', names: ['env', ''] }] },
        context
      )
    ).toEqual({ '/fields/0/names/1': 'This field is required' });
    expect(
      validateValues(
        definitionOf('transform').fields,
        { statements: [{ conditions: [''], statements: [''] }] },
        context
      )
    ).toEqual({
      '/statements/0/conditions/0': 'This field is required',
      '/statements/0/statements/0': 'This field is required',
    });
  });

  it('does not count blank rows as duplicates', () => {
    const { fields: destinationFields } = definitionOf('elasticsearch', 'destination');
    expect(validateValues(destinationFields, { write_patterns: ['', ''] }, context)).toEqual({
      '/write_patterns/0': 'This field is required',
      '/write_patterns/1': 'This field is required',
    });
    expect(
      validateValues(destinationFields, { write_patterns: ['logs-*', 'logs-*'] }, context)
    ).toEqual({
      '/write_patterns': 'Items must be unique',
    });
  });

  it('checks string, number and array constraints', () => {
    const custom: CatalogueNamedFieldDefinition[] = [
      { type: 'string', name: 'name', min_length: 3, max_length: 5 },
      { type: 'integer', name: 'count', minimum: 1, maximum: 5 },
      { type: 'array', name: 'tags', items: { type: 'string' }, max_items: 1, unique_items: true },
    ];
    expect(validateValues(custom, { name: 'ab', count: 9, tags: ['a', 'b'] }, context)).toEqual({
      '/name': 'Enter at least 3 characters',
      '/count': 'Must be at most 5',
      '/tags': 'Add at most 1 item',
    });
    expect(
      validateValues(custom, { name: 'abcdef', count: 1.5, tags: ['a', 'a'] }, context)
    ).toEqual({
      '/name': 'Enter at most 5 characters',
      '/count': 'Enter a whole number',
      '/tags': 'Add at most 1 item',
    });
  });

  it('leaves the pattern of a string and of a map key for the distributor to check', () => {
    const custom: CatalogueNamedFieldDefinition[] = [
      { type: 'string', name: 'name', pattern: '^[a-z]+$' },
      {
        type: 'map',
        name: 'labels',
        key_pattern: '^[a-z]+$',
        value_schema: { type: 'string' },
      },
    ];

    expect(validateValues(custom, { name: 'AB1', labels: { 'a b': 'c' } }, context)).toEqual({});
  });

  it('does not check the formats the distributor does not check either', () => {
    const formats = ['url', 'uri', 'hostname', 'email', 'duration'] as const;

    for (const format of formats) {
      expect(
        validateValues([{ type: 'string', name: 'value', format }], { value: 'any text' }, context)
      ).toEqual({});
    }
  });

  describe('maps', () => {
    const labels: CatalogueMapField & { name: string } = {
      type: 'map',
      name: 'labels',
      value_schema: { type: 'string', max_length: 4 },
      min_entries: 1,
      max_entries: 2,
    };
    const validate = (value: Record<string, string>, field = labels) =>
      validateValues([field], { labels: value }, context);

    it('accepts entries whose keys and values fit', () => {
      expect(validate({ team: 'core', tier: 'gold' })).toEqual({});
    });

    it('asks for a key', () => {
      expect(validate({ '': 'core', 'Team name': 'core' })).toEqual({ '/labels/': 'Enter a key' });
    });

    it('asks for the value of an entry that has none, as it would not be written', () => {
      expect(validate({ team: '' })).toEqual({ '/labels/team': 'This field is required' });
    });

    it('checks the value of each entry against the value schema', () => {
      expect(validate({ team: 'platform' })).toEqual({
        '/labels/team': 'Enter at most 4 characters',
      });
    });

    it('checks how many entries there are', () => {
      expect(validate({ a: '1' }, { ...labels, min_entries: 2 })).toEqual({
        '/labels': 'Add at least 2 entries',
      });
      expect(validate({ a: '1', b: '2', c: '3' })).toEqual({ '/labels': 'Add at most 2 entries' });
    });

    it('lets a map that is not required go back to having no entries', () => {
      expect(validate({})).toEqual({});
      expect(validate({}, { ...labels, required: true })).toEqual({
        '/labels': 'This field is required',
      });
    });

    it('counts a required map without entries as missing', () => {
      const { min_entries: _, ...withoutMinimum } = labels;

      expect(validate({}, withoutMinimum)).toEqual({});
      expect(validate({}, { ...withoutMinimum, required: true })).toEqual({
        '/labels': 'This field is required',
      });
    });
  });
});
