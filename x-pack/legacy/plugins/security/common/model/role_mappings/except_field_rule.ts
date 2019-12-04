/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { BaseRuleGroup } from './base_rule_group';
import { FieldRule } from './field_rule';
import { BaseRule } from './base_rule';
import { ExceptAllRule } from './except_all_rule';
import { ExceptAnyRule } from './except_any_rule';

export class ExceptFieldRule extends BaseRuleGroup {
  constructor(private fieldRule: FieldRule) {
    super();
  }

  public getRules() {
    return [this.fieldRule];
  }

  public getType() {
    return `except`;
  }

  public replaceRule(index: number, newRule: FieldRule) {
    this.fieldRule = newRule;
  }

  public removeRule() {
    throw new Error('removeRule intentionally not implemented.');
  }

  public addRule(rule: FieldRule) {
    throw new Error('addRule intentionally not implemented.');
  }

  public canAddRule(): boolean {
    return false;
  }

  public canRemoveRule(): boolean {
    return false;
  }

  public canContainRule(rule: BaseRule) {
    const forbiddenRules = [ExceptAllRule, ExceptAnyRule, ExceptFieldRule];
    return forbiddenRules.every(forbiddenRule => !(rule instanceof forbiddenRule));
  }

  public getDisplayTitle() {
    return `The following is false`;
  }

  public clone() {
    return new ExceptFieldRule(this.fieldRule.clone());
  }

  public toRaw() {
    return {
      except: this.fieldRule.toRaw(),
    };
  }
}
