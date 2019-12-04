/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseRuleGroup } from './base_rule_group';
import { BaseRule } from './base_rule';
import { ExceptAllRule } from './except_all_rule';
import { ExceptFieldRule } from './except_field_rule';

export class ExceptAnyRule extends BaseRuleGroup {
  constructor(private rules: BaseRule[] = []) {
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

  public replaceRule(ruleIndex: number, rule: BaseRule) {
    this.rules.splice(ruleIndex, 1, rule);
  }

  public removeRule(ruleIndex: number) {
    this.rules.splice(ruleIndex, 1);
  }

  public addRule(rule: BaseRule) {
    this.rules.push(rule);
  }

  public canContainRule(rule: BaseRule) {
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
