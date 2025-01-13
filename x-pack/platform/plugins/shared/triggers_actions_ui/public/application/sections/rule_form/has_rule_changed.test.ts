/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InitialRule } from './rule_reducer';
import { hasRuleChanged } from './has_rule_changed';

function createRule(overrides = {}): InitialRule {
  return {
    params: {},
    consumer: 'test',
    ruleTypeId: 'test',
    schedule: {
      interval: '1m',
    },
    actions: [],
    tags: [],
    notifyWhen: 'onActionGroupChange',
    ...overrides,
  };
}

test('should return false for same rule', () => {
  const a = createRule();
  expect(hasRuleChanged(a, a, true)).toEqual(false);
});

test('should return true for different rule', () => {
  const a = createRule();
  const b = createRule({ ruleTypeId: 'differentTest' });
  expect(hasRuleChanged(a, b, true)).toEqual(true);
});

test('should correctly compare name field', () => {
  // name field doesn't exist initially
  const a = createRule();
  // set name to actual value
  const b = createRule({ name: 'myRule' });
  // set name to different value
  const c = createRule({ name: 'anotherRule' });
  // set name to various empty/null/undefined states
  const d = createRule({ name: '' });
  const e = createRule({ name: undefined });
  const f = createRule({ name: null });

  expect(hasRuleChanged(a, b, true)).toEqual(true);
  expect(hasRuleChanged(a, c, true)).toEqual(true);
  expect(hasRuleChanged(a, d, true)).toEqual(false);
  expect(hasRuleChanged(a, e, true)).toEqual(false);
  expect(hasRuleChanged(a, f, true)).toEqual(false);

  expect(hasRuleChanged(b, c, true)).toEqual(true);
  expect(hasRuleChanged(b, d, true)).toEqual(true);
  expect(hasRuleChanged(b, e, true)).toEqual(true);
  expect(hasRuleChanged(b, f, true)).toEqual(true);

  expect(hasRuleChanged(c, d, true)).toEqual(true);
  expect(hasRuleChanged(c, e, true)).toEqual(true);
  expect(hasRuleChanged(c, f, true)).toEqual(true);

  expect(hasRuleChanged(d, e, true)).toEqual(false);
  expect(hasRuleChanged(d, f, true)).toEqual(false);
});

test('should correctly compare ruleTypeId field', () => {
  const a = createRule();

  // set ruleTypeId to different value
  const b = createRule({ ruleTypeId: 'myRuleId' });
  // set ruleTypeId to various empty/null/undefined states
  const c = createRule({ ruleTypeId: '' });
  const d = createRule({ ruleTypeId: undefined });
  const e = createRule({ ruleTypeId: null });

  expect(hasRuleChanged(a, b, true)).toEqual(true);
  expect(hasRuleChanged(a, c, true)).toEqual(true);
  expect(hasRuleChanged(a, d, true)).toEqual(true);
  expect(hasRuleChanged(a, e, true)).toEqual(true);

  expect(hasRuleChanged(b, c, true)).toEqual(true);
  expect(hasRuleChanged(b, d, true)).toEqual(true);
  expect(hasRuleChanged(b, e, true)).toEqual(true);

  expect(hasRuleChanged(c, d, true)).toEqual(false);
  expect(hasRuleChanged(c, e, true)).toEqual(false);
  expect(hasRuleChanged(d, e, true)).toEqual(false);
});

test('should correctly compare throttle field', () => {
  // throttle field doesn't exist initially
  const a = createRule();
  // set throttle to actual value
  const b = createRule({ throttle: '1m' });
  // set throttle to different value
  const c = createRule({ throttle: '1h' });
  // set throttle to various empty/null/undefined states
  const d = createRule({ throttle: '' });
  const e = createRule({ throttle: undefined });
  const f = createRule({ throttle: null });

  expect(hasRuleChanged(a, b, true)).toEqual(true);
  expect(hasRuleChanged(a, c, true)).toEqual(true);
  expect(hasRuleChanged(a, d, true)).toEqual(false);
  expect(hasRuleChanged(a, e, true)).toEqual(false);
  expect(hasRuleChanged(a, f, true)).toEqual(false);

  expect(hasRuleChanged(b, c, true)).toEqual(true);
  expect(hasRuleChanged(b, d, true)).toEqual(true);
  expect(hasRuleChanged(b, e, true)).toEqual(true);
  expect(hasRuleChanged(b, f, true)).toEqual(true);

  expect(hasRuleChanged(c, d, true)).toEqual(true);
  expect(hasRuleChanged(c, e, true)).toEqual(true);
  expect(hasRuleChanged(c, f, true)).toEqual(true);

  expect(hasRuleChanged(d, e, true)).toEqual(false);
  expect(hasRuleChanged(d, f, true)).toEqual(false);
});

test('should correctly compare tags field', () => {
  const a = createRule();
  const b = createRule({ tags: ['first'] });

  expect(hasRuleChanged(a, b, true)).toEqual(true);
});

test('should correctly compare schedule field', () => {
  const a = createRule();
  const b = createRule({ schedule: { interval: '3h' } });

  expect(hasRuleChanged(a, b, true)).toEqual(true);
});

test('should correctly compare actions field', () => {
  const a = createRule();
  const b = createRule({
    actions: [{ actionTypeId: 'action', group: 'group', id: 'actionId', params: {} }],
  });

  expect(hasRuleChanged(a, b, true)).toEqual(true);
});

test('should skip comparing params field if compareParams=false', () => {
  const a = createRule();
  const b = createRule({ params: { newParam: 'value' } });

  expect(hasRuleChanged(a, b, false)).toEqual(false);
});

test('should correctly compare params field if compareParams=true', () => {
  const a = createRule();
  const b = createRule({ params: { newParam: 'value' } });

  expect(hasRuleChanged(a, b, true)).toEqual(true);
});

test('should correctly compare notifyWhen field', () => {
  const a = createRule();
  const b = createRule({ notifyWhen: 'onActiveAlert' });

  expect(hasRuleChanged(a, b, true)).toEqual(true);
});
