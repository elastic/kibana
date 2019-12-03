/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseRule } from './base_rule';

export abstract class BaseRuleGroup extends BaseRule {
  abstract getRules(): BaseRule[];

  abstract replaceRule(ruleIndex: number, rule: BaseRule): void;

  abstract removeRule(ruleIndex: number): void;

  abstract addRule(rule: BaseRule): void;
}
