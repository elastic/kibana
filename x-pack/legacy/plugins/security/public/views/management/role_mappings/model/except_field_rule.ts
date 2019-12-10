/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { RuleGroup } from './rule_group';
import { FieldRule } from './field_rule';
import { Rule } from './rule';
import { ExceptAllRule } from './except_all_rule';
import { ExceptAnyRule } from './except_any_rule';

/**
 * Represents a negated field rule {@link FieldRule}.
 */
export class ExceptFieldRule extends RuleGroup {
  constructor(private fieldRule: FieldRule = new FieldRule('username', '*')) {
    super();
  }

  /** {@see RuleGroup.getRules} */
  public getRules() {
    return [this.fieldRule];
  }

  /** {@see RuleGroup.getType} */
  public getType() {
    return `except`;
  }

  /** {@see RuleGroup.replaceRule} */
  public replaceRule(index: number, newRule: FieldRule) {
    this.fieldRule = newRule;
  }

  /** {@see RuleGroup.removeRule} */
  public removeRule() {
    throw new Error('removeRule intentionally not implemented.');
  }

  /** {@see RuleGroup.addRule} */
  public addRule(rule: FieldRule) {
    throw new Error('addRule intentionally not implemented.');
  }

  /** {@see RuleGroup.canAddRule} */
  public canAddRule(): boolean {
    return false;
  }

  /** {@see RuleGroup.canRemoveRule} */
  public canRemoveRule(): boolean {
    return false;
  }

  // FIXME
  /** {@see RuleGroup.canContainRule} */
  public canContainRule(rule: Rule) {
    const forbiddenRules = [ExceptAllRule, ExceptAnyRule, ExceptFieldRule];
    return forbiddenRules.every(forbiddenRule => !(rule instanceof forbiddenRule));
  }

  /** {@see RuleGroup.getDisplayTitle} */
  public getDisplayTitle() {
    return i18n.translate(
      'xpack.security.management.editRoleMapping.exceptFieldRule.displayTitle',
      {
        defaultMessage: 'The following is false',
      }
    );
  }

  /** {@see RuleGroup.clone} */
  public clone() {
    return new ExceptFieldRule(this.fieldRule.clone());
  }

  /** {@see RuleGroup.toRaw} */
  public toRaw() {
    return {
      except: this.fieldRule.toRaw(),
    };
  }
}
