/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseRuleGroup } from './base_rule_group';
import { BaseRule } from './base_rule';

export class ExceptAllRule extends BaseRuleGroup {
  constructor(private rules: BaseRule[] = []) {
    super();
  }

  public getRules() {
    return [...this.rules];
  }

  public getType() {
    return `all`;
  }

  public getDisplayTitle() {
    return `Any of the following are false`;
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

  public clone() {
    return new ExceptAllRule(this.rules.map(r => r.clone()));
  }

  public toRaw() {
    const rawRule = {
      all: [...this.rules.map(rule => rule.toRaw())],
    };

    return {
      except: rawRule,
    };
  }
}
