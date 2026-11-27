/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogueNamedFieldDefinition } from '@kbn/streams-schema';
import { applyChoice, getDefaultChoice, getSelectedChoice } from './choice_groups';
import {
  createChoiceValue,
  createInitialObject,
  fromConfigEntries,
  toConfigEntries,
  trimItemScopes,
} from './serialize';
import { definitionOf, itemFieldOf, testCatalogue, withItemTelemetry } from './test_helpers';

const context = { metadata: testCatalogue.metadata, telemetry: ['logs' as const] };
const setDefinition = definitionOf('set');
const operation = itemFieldOf(setDefinition, 'operations');

describe('choice groups', () => {
  // `set` targets a location or a context, or neither, and always takes one kind of value.
  const [targetPath, valueSource] = operation.choice_groups ?? [];

  it('starts a mandatory group with its default or first member, an optional one only with a named default', () => {
    expect(getDefaultChoice(valueSource)).toBe('value');
    expect(getDefaultChoice({ ...valueSource, default_field: undefined })).toBe(
      valueSource.fields[0]
    );
    expect(getDefaultChoice(targetPath)).toBe('location');
    expect(getDefaultChoice({ ...targetPath, default_field: undefined })).toBeUndefined();
  });

  it('selects the member present in the object, then the default of a mandatory group', () => {
    expect(getSelectedChoice(targetPath, { context: 'log' })).toBe('context');
    expect(getSelectedChoice(targetPath, {})).toBeUndefined();
    expect(getSelectedChoice(valueSource, {})).toBe('value');
    expect(getSelectedChoice(valueSource, { ottl_value: '' })).toBe('ottl_value');
  });

  it('switching a choice drops the other member and keeps the selection while blank', () => {
    const next = applyChoice(valueSource, { value: 'core', action: 'upsert' }, 'ottl_value', '');
    expect(next).toEqual({ action: 'upsert', ottl_value: '' });
    expect(getSelectedChoice(valueSource, next)).toBe('ottl_value');
  });
});

describe('trimItemScopes', () => {
  const item = { location: 'record', path: 'tier', action: 'upsert', value: 'gold' };

  it('drops removed signals from item scopes, keeping scopes with nothing left as they are', () => {
    const { fields } = withItemTelemetry(setDefinition);
    expect(
      trimItemScopes(
        fields,
        {
          operations: [
            { ...item, telemetry: ['logs', 'metrics'] },
            { ...item, telemetry: ['metrics'] },
            item,
          ],
        },
        ['logs']
      )
    ).toEqual({
      operations: [{ ...item, telemetry: ['logs'] }, { ...item, telemetry: ['metrics'] }, item],
    });
  });
});

describe('initial values', () => {
  it('starts a required list with one item that preselects its required options', () => {
    expect(createInitialObject(setDefinition.fields, undefined, context)).toEqual({
      operations: [{ location: 'record', action: 'upsert' }],
    });
    expect(createInitialObject(definitionOf('add_fields').fields, undefined, context)).toEqual({
      fields: [{ location: 'attributes', action: 'upsert' }],
    });
  });

  it('starts a required list of plain values with a blank row to fill in', () => {
    expect(createInitialObject(definitionOf('delete_fields').fields, undefined, context)).toEqual({
      fields: [{ location: 'attributes', names: [''] }],
    });
    expect(createInitialObject(definitionOf('filter').fields, undefined, context)).toEqual({
      conditions: [{ conditions: [''] }],
    });
    // The guard conditions of a block are optional, so only its statements get a row.
    expect(createInitialObject(definitionOf('transform').fields, undefined, context)).toEqual({
      statements: [{ statements: [''], shared_cache: false }],
    });
  });

  it('writes nothing for rows that were left blank', () => {
    const { fields } = definitionOf('filter');
    expect(
      toConfigEntries(
        fields,
        { conditions: [{ conditions: ['', 'attributes["env"] == "dev"', ''] }] },
        [],
        context.telemetry
      )
    ).toEqual([{ name: 'conditions', value: [{ conditions: ['attributes["env"] == "dev"'] }] }]);
  });

  it('opens the default member of an optional choice group, blank, and drops it when left so', () => {
    const optionalValue = (operation.choice_groups ?? []).map((group) =>
      group.id === 'value_source' ? { ...group, min_selected: 0 as const } : group
    );
    const initial = createInitialObject(operation.fields, optionalValue, context);
    expect(initial).toEqual({ location: 'record', value: '', action: 'upsert' });
    expect(getSelectedChoice(optionalValue[1], initial)).toBe('value');

    const optionalDefinition = setDefinition.fields.map((field) =>
      field.name === 'operations' && field.type === 'array' && field.items.type === 'object'
        ? { ...field, items: { ...field.items, choice_groups: optionalValue } }
        : field
    );
    expect(
      toConfigEntries(
        optionalDefinition,
        { operations: [{ ...initial, path: 'tier' }] },
        [],
        context.telemetry
      )
    ).toEqual([
      { name: 'operations', value: [{ location: 'record', path: 'tier', action: 'upsert' }] },
    ]);
  });

  it('creates present-but-blank choice values', () => {
    const [location, , , , ottlValue] = operation.fields;
    expect(createChoiceValue(location, context)).toBe('record');
    expect(createChoiceValue(ottlValue, context)).toBe('');
  });
});

describe('config entry round trip', () => {
  it('splits per-telemetry overrides from editable values', () => {
    const { values, scoped } = fromConfigEntries([
      { name: 'operations', value: [{ action: 'update', location: 'attributes', path: 'x' }] },
      { name: 'operations', value: [], telemetry: ['traces'] },
    ]);
    expect(values).toEqual({
      operations: [{ action: 'update', location: 'attributes', path: 'x' }],
    });
    expect(scoped).toEqual([{ name: 'operations', value: [], telemetry: ['traces'] }]);
  });

  it('drops blank values and unselected choices', () => {
    const entries = toConfigEntries(
      setDefinition.fields,
      {
        condition: '',
        operations: [
          { location: 'attributes', path: 'team', action: 'upsert', value: 'core' },
          { location: 'attributes', path: 'tier', action: 'insert', value: 1, ottl_value: 'x' },
          { context: 'log', path: 'body', action: 'upsert', ottl_value: '' },
        ],
      },
      [],
      ['logs']
    );
    expect(entries).toEqual([
      {
        name: 'operations',
        value: [
          { location: 'attributes', path: 'team', value: 'core', action: 'upsert' },
          { location: 'attributes', path: 'tier', value: 1, action: 'insert' },
          { context: 'log', path: 'body', action: 'upsert' },
        ],
      },
    ]);
  });

  it('drops fields that are not available', () => {
    const fields: CatalogueNamedFieldDefinition[] = [
      { name: 'action', type: 'enum', options: [{ value: 'upsert' }, { value: 'delete' }] },
      {
        name: 'value',
        type: 'string',
        available_when: { path: '/action', operator: 'neq', value: 'delete' },
      },
    ];
    expect(toConfigEntries(fields, { action: 'delete', value: 'ignored' }, [], ['logs'])).toEqual([
      { name: 'action', value: 'delete' },
    ]);
  });

  it('keeps item telemetry and parameters the definition does not know', () => {
    const entries = toConfigEntries(
      withItemTelemetry(setDefinition).fields,
      {
        operations: [
          {
            location: 'attributes',
            path: 'team',
            action: 'upsert',
            value: 'core',
            telemetry: ['logs'],
          },
        ],
        legacy: true,
      },
      [{ name: 'operations', value: [], telemetry: ['traces'] }],
      ['logs', 'traces']
    );
    expect(entries).toEqual([
      {
        name: 'operations',
        value: [
          {
            location: 'attributes',
            path: 'team',
            value: 'core',
            action: 'upsert',
            telemetry: ['logs'],
          },
        ],
      },
      { name: 'legacy', value: true },
      { name: 'operations', value: [], telemetry: ['traces'] },
    ]);
  });
});
