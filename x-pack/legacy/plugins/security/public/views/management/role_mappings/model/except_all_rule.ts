/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RuleGroup } from './rule_group';
import { Rule } from './rule';

export class ExceptAllRule extends RuleGroup {
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
    return `Any of the following are false`;
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
    return true;
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
