/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Rule } from './rule';

/**
 * Represents a catagory of Role Mapping rules which are capable of containing other rules.
 */
export abstract class RuleGroup extends Rule {
  /**
   * Returns all immediate sub-rules within this group (non-recursive).
   */
  abstract getRules(): Rule[];

  /**
   * Replaces the rule at the indicated location.
   * @param ruleIndex the location of the rule to replace.
   * @param rule the new rule.
   */
  abstract replaceRule(ruleIndex: number, rule: Rule): void;

  /**
   * Removes the rule at the indicated location.
   * @param ruleIndex the location of the rule to remove.
   */
  abstract removeRule(ruleIndex: number): void;

  /**
   * Adds a rule to this group.
   * @param rule the rule to add.
   */
  abstract addRule(rule: Rule): void;

  /**
   * Determines if the provided rules are allowed to be contained within this group.
   * @param rules the rules to test.
   */
  abstract canContainRules(rules: Rule[]): boolean;
}
