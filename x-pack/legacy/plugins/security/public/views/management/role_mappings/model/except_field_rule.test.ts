/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AllRule, AnyRule, FieldRule, ExceptAllRule, ExceptAnyRule, ExceptFieldRule } from '.';

describe('Except Field rule', () => {
  it('can be constructed without sub rules', () => {
    const rule = new ExceptFieldRule();
    expect(rule.getRules()).toHaveLength(0);
  });

  it('can be constructed with a sub rule', () => {
    const rule = new ExceptFieldRule(new FieldRule('username', '*'));
    expect(rule.getRules()).toHaveLength(1);
  });

  it('can accept a single sub rule of type FieldRule', () => {
    const rule = new ExceptFieldRule();
    expect(rule.canAddRule()).toEqual(true);
    expect(rule.canContainRules([new FieldRule('username', '*')])).toEqual(true);
  });

  it('cannot accept multiple rules', () => {
    const rule = new ExceptFieldRule();
    expect(rule.canAddRule()).toEqual(true);
    rule.addRule(new FieldRule('username', '*'));

    expect(rule.canAddRule()).toEqual(false);
    expect(rule.canContainRules([new FieldRule('username', '*')])).toEqual(false);
  });

  it('cannot accept any other rules except field', () => {
    const subRules = [
      new AllRule(),
      new AnyRule(),
      new ExceptAllRule(),
      new ExceptAnyRule(),
      new ExceptFieldRule(),
    ];

    const rule = new ExceptFieldRule();
    subRules.forEach(subRule => expect(rule.canContainRules([subRule])).toEqual(false));
  });

  it('can replace an existing rule', () => {
    const rule = new ExceptFieldRule(new FieldRule('username', '*'));
    const newRule = new FieldRule('dn', '*');
    rule.replaceRule(0, newRule);
    expect(rule.getRules()).toEqual([newRule]);
  });

  it('can remove an existing rule', () => {
    const rule = new ExceptFieldRule(new FieldRule('username', '*'));
    rule.removeRule();
    expect(rule.getRules()).toHaveLength(0);
  });

  it('can covert itself into a raw representation', () => {
    const rule = new ExceptFieldRule(new FieldRule('username', '*'));
    expect(rule.toRaw()).toEqual({
      except: { field: { username: '*' } },
    });
  });

  it('can clone itself', () => {
    const rule = new ExceptFieldRule(new FieldRule('username', '*'));
    const clone = rule.clone();

    expect(clone.toRaw()).toEqual(rule.toRaw());
    expect(clone.getRules()).toEqual(rule.getRules());
    expect(clone.getRules()).not.toBe(rule.getRules());
  });
});
