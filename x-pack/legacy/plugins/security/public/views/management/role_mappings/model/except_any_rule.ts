/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleGroup } from './rule_group';
import { Rule } from './rule';
import { ExceptAllRule } from './except_all_rule';
import { ExceptFieldRule } from './except_field_rule';

export class ExceptAnyRule extends RuleGroup {
  constructor(private rules: Rule[] = []) {
    super();
  }

  public getRules() {
    return [...this.rules];
  }

  public getType() {
    return `any`;
  }

  public getDisplayTitle() {
    return `None of the following are true`;
  }

  public replaceRule(ruleIndex: number, rule: Rule) {
    this.rules.splice(ruleIndex, 1, rule);
  }

  public removeRule(ruleIndex: number) {
    this.rules.splice(ruleIndex, 1);
  }

  public addRule(rule: Rule) {
    this.rules.push(rule);
  }

  public canContainRule(rule: Rule) {
    const forbiddenRules = [ExceptAllRule, ExceptAnyRule, ExceptFieldRule];
    return forbiddenRules.every(forbiddenRule => !(rule instanceof forbiddenRule));
  }

  public clone() {
    return new ExceptAnyRule(this.rules.map(r => r.clone()));
  }

  public toRaw() {
    const rawRule = {
      any: [...this.rules.map(rule => rule.toRaw())],
    };

    return {
      except: rawRule,
    };
  }
}
