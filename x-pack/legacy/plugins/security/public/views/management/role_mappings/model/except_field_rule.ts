/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { RuleGroup } from './rule_group';
import { FieldRule } from './field_rule';
import { Rule } from './rule';

/**
 * Represents a negated field rule {@link FieldRule}.
 */
export class ExceptFieldRule extends RuleGroup {
  constructor(private fieldRule: FieldRule | null = null) {
    super();
  }

  /** {@see RuleGroup.getRules} */
  public getRules() {
    return this.fieldRule ? [this.fieldRule] : [];
  }

  /** {@see RuleGroup.replaceRule} */
  public replaceRule(index: number, newRule: FieldRule) {
    this.fieldRule = newRule;
  }

  /** {@see RuleGroup.removeRule} */
  public removeRule() {
    this.fieldRule = null;
  }

  /** {@see RuleGroup.addRule} */
  public addRule(rule: FieldRule) {
    if (this.fieldRule) {
      throw new Error('Rule already exists. Unable to add more to "ExceptFieldRule"');
    }
    this.fieldRule = rule;
  }

  /** {@see RuleGroup.canAddRule} */
  public canAddRule(): boolean {
    return this.fieldRule === null;
  }

  /** {@see RuleGroup.canRemoveRule} */
  public canRemoveRule(): boolean {
    return false;
  }

  /** {@see RuleGroup.canContainRules} */
  public canContainRules(rules: Rule[]) {
    if (rules.length === 0) {
      return true;
    }
    return this.fieldRule === null && rules.length === 1 && rules[0] instanceof FieldRule;
  }

  /** {@see RuleGroup.getDisplayTitle} */
  public getDisplayTitle() {
    return i18n.translate(
      'xpack.security.management.editRoleMapping.exceptFieldRule.displayTitle',
      {
        defaultMessage: 'Is false',
      }
    );
  }

  /** {@see RuleGroup.clone} */
  public clone() {
    return new ExceptFieldRule(this.fieldRule ? this.fieldRule.clone() : null);
  }

  /** {@see RuleGroup.toRaw} */
  public toRaw() {
    return {
      except: this.fieldRule ? this.fieldRule.toRaw() : {},
    };
  }
}
