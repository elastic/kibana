/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleGroup } from './rule_group';
import { Rule } from './rule';

export class AllRule extends RuleGroup {
  constructor(private rules: Rule[] = []) {
    super();
  }

  public getRules() {
    return [...this.rules];
  }

  public getType() {
    return `all`;
  }

  public getDisplayTitle() {
    return `All of the following are true`;
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

  public canContainRule() {
    return true;
  }

  public clone() {
    return new AllRule(this.rules.map(r => r.clone()));
  }

  public toRaw() {
    return {
      all: [...this.rules.map(rule => rule.toRaw())],
    };
  }
}
