/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AllRule,
  AnyRule,
  FieldRule,
  ExceptAllRule,
  ExceptAnyRule,
  ExceptFieldRule,
  RuleGroup,
} from '.';

describe('All rule', () => {
  it('can be constructed without sub rules', () => {
    const rule = new AllRule();
    expect(rule.getRules()).toHaveLength(0);
  });

  it('can be constructed with sub rules', () => {
    const rule = new AllRule([new AnyRule()]);
    expect(rule.getRules()).toHaveLength(1);
  });

  it('can accept rules of any type', () => {
    const subRules = [
      new AllRule(),
      new AnyRule(),
      new FieldRule('username', '*'),
      new ExceptAllRule(),
      new ExceptAnyRule(),
      new ExceptFieldRule(),
    ];

    const rule = new AllRule() as RuleGroup;
    expect(rule.canAddRule()).toEqual(true);
    expect(rule.canContainRules(subRules)).toEqual(true);
    subRules.forEach(sr => rule.addRule(sr));
    expect(rule.getRules()).toEqual([...subRules]);
  });

  it('can replace an existing rule', () => {
    const rule = new AllRule([new AnyRule()]);
    const newRule = new FieldRule('username', '*');
    rule.replaceRule(0, newRule);
    expect(rule.getRules()).toEqual([newRule]);
  });

  it('can remove an existing rule', () => {
    const rule = new AllRule([new AnyRule()]);
    rule.removeRule(0);
    expect(rule.getRules()).toHaveLength(0);
  });

  it('can covert itself into a raw representation', () => {
    const rule = new AllRule([new AnyRule()]);
    expect(rule.toRaw()).toEqual({
      all: [{ any: [] }],
    });
  });

  it('can clone itself', () => {
    const subRules = [new AnyRule()];
    const rule = new AllRule(subRules);
    const clone = rule.clone();

    expect(clone.toRaw()).toEqual(rule.toRaw());
    expect(clone.getRules()).toEqual(rule.getRules());
    expect(clone.getRules()).not.toBe(rule.getRules());
  });
});
