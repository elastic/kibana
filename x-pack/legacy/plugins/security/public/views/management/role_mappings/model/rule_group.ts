/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Rule } from './rule';

export abstract class RuleGroup extends Rule {
  abstract getRules(): Rule[];

  abstract replaceRule(ruleIndex: number, rule: Rule): void;

  abstract removeRule(ruleIndex: number): void;

  abstract addRule(rule: Rule): void;

  abstract canContainRule(rule: Rule): boolean;

  public canAddRule(): boolean {
    return true;
  }

  public canRemoveRule(): boolean {
    return true;
  }
}
