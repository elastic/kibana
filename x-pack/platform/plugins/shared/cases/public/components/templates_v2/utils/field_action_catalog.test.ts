/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConditionalLogicActions, getValidationActions } from './field_action_catalog';

const ruleIds = (control: string) => getValidationActions(control).map((action) => action.id);

describe('getValidationActions', () => {
  it('always offers required, required_on_close, and pattern', () => {
    for (const control of ['SELECT_BASIC', 'TOGGLE', 'DATE_PICKER', 'USER_PICKER']) {
      expect(ruleIds(control)).toEqual(
        expect.arrayContaining(['required', 'required_on_close', 'pattern'])
      );
    }
  });

  it('offers min/max only for number controls', () => {
    expect(ruleIds('INPUT_NUMBER')).toEqual(expect.arrayContaining(['min', 'max']));
    expect(ruleIds('INPUT_TEXT')).not.toEqual(expect.arrayContaining(['min', 'max']));
  });

  it('offers min_length/max_length only for text controls', () => {
    expect(ruleIds('INPUT_TEXT')).toEqual(expect.arrayContaining(['min_length', 'max_length']));
    expect(ruleIds('TEXTAREA')).toEqual(expect.arrayContaining(['min_length', 'max_length']));
    expect(ruleIds('INPUT_NUMBER')).not.toEqual(
      expect.arrayContaining(['min_length', 'max_length'])
    );
  });

  it('offers no type-specific rules for controls that honor none', () => {
    expect(ruleIds('SELECT_BASIC')).toEqual(['required', 'required_on_close', 'pattern']);
  });

  it('scaffolds a validation block for each rule', () => {
    const actions = getValidationActions('INPUT_TEXT');
    for (const action of actions) {
      expect(action.blockKey).toBe('validation');
      expect(action.value).toBeDefined();
    }
  });
});

describe('getConditionalLogicActions', () => {
  it('offers show_when (simple + compound) under display and required_when under validation', () => {
    const actions = getConditionalLogicActions();
    const byId = Object.fromEntries(actions.map((action) => [action.id, action]));

    expect(byId.show_when).toMatchObject({ blockKey: 'display', ruleKey: 'show_when' });
    expect(byId.show_when_compound).toMatchObject({ blockKey: 'display', ruleKey: 'show_when' });
    expect(byId.required_when).toMatchObject({ blockKey: 'validation', ruleKey: 'required_when' });
  });

  it('scaffolds a condition referencing another field', () => {
    const simple = getConditionalLogicActions().find((action) => action.id === 'show_when');
    expect(simple?.value).toEqual({ field: 'field_name', operator: 'eq', value: 'value' });
  });

  it('scaffolds a compound condition with a rules array', () => {
    const compound = getConditionalLogicActions().find(
      (action) => action.id === 'show_when_compound'
    );
    expect(compound?.value).toMatchObject({ combine: 'all', rules: expect.any(Array) });
  });
});
