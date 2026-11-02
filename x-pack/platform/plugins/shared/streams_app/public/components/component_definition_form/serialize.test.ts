/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyChoice, getSelectedChoice } from './choice_groups';
import {
  createChoiceValue,
  createInitialObject,
  fromConfigEntries,
  toConfigEntries,
} from './serialize';
import { addFieldsDefinition, addFieldsItemField, testCatalogue } from './test_helpers';

const context = { metadata: testCatalogue.metadata, telemetry: ['logs' as const] };

describe('choice groups', () => {
  const [targetPath, valueSource] = addFieldsItemField().choice_groups ?? [];

  it('selects the member present in the object, then the default', () => {
    expect(getSelectedChoice(targetPath, { context: 'log' })).toBe('context');
    expect(getSelectedChoice(targetPath, {})).toBe('location');
    expect(getSelectedChoice(valueSource, { ottl_value: '' })).toBe('ottl_value');
  });

  it('switching a choice drops the other member and keeps the selection while blank', () => {
    const next = applyChoice(valueSource, { value: 'core', action: 'upsert' }, 'ottl_value', '');
    expect(next).toEqual({ action: 'upsert', ottl_value: '' });
    expect(getSelectedChoice(valueSource, next)).toBe('ottl_value');
  });
});

describe('initial values', () => {
  it('starts add_fields with one row preselecting location and action', () => {
    expect(createInitialObject(addFieldsDefinition().fields, undefined, context)).toEqual({
      fields: [{ location: 'record', action: 'upsert' }],
    });
  });

  it('creates present-but-blank choice values', () => {
    const [location, , , , ottlValue] = addFieldsItemField().fields;
    expect(createChoiceValue(location, context)).toBe('record');
    expect(createChoiceValue(ottlValue, context)).toBe('');
  });
});

describe('config entry round trip', () => {
  const definition = addFieldsDefinition();

  it('splits per-telemetry overrides from editable values', () => {
    const { values, scoped } = fromConfigEntries([
      { name: 'fields', value: [{ action: 'delete', location: 'attributes', path: 'x' }] },
      { name: 'fields', value: [], telemetry: ['traces'] },
    ]);
    expect(values).toEqual({ fields: [{ action: 'delete', location: 'attributes', path: 'x' }] });
    expect(scoped).toEqual([{ name: 'fields', value: [], telemetry: ['traces'] }]);
  });

  it('drops blank values, unavailable fields and unselected choices', () => {
    const entries = toConfigEntries(
      definition.fields,
      {
        fields: [
          { location: 'attributes', path: 'team', action: 'upsert', value: 'core' },
          { location: 'attributes', path: 'old', action: 'delete', value: 'ignored' },
          { context: 'log', path: 'body', action: 'upsert', ottl_value: '' },
        ],
      },
      [],
      ['logs']
    );
    expect(entries).toEqual([
      {
        name: 'fields',
        value: [
          { location: 'attributes', path: 'team', value: 'core', action: 'upsert' },
          { location: 'attributes', path: 'old', action: 'delete' },
          { context: 'log', path: 'body', action: 'upsert' },
        ],
      },
    ]);
  });

  it('keeps item telemetry and parameters the definition does not know', () => {
    const entries = toConfigEntries(
      definition.fields,
      {
        fields: [
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
      [{ name: 'fields', value: [], telemetry: ['traces'] }],
      ['logs', 'traces']
    );
    expect(entries).toEqual([
      {
        name: 'fields',
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
      { name: 'fields', value: [], telemetry: ['traces'] },
    ]);
  });
});
