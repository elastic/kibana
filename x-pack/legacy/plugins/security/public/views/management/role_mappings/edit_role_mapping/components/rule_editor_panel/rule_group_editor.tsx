/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AddRuleButton } from './add_rule_button';
import { RuleGroupTitle } from './rule_group_title';
import { FieldRuleEditor } from './field_rule_editor';
import { RuleGroup, Rule, FieldRule } from '../../../model';
import { isRuleGroup } from '../../services/is_rule_group';

interface Props {
  rule: RuleGroup;
  allowAdd: boolean;
  parentRule?: RuleGroup;
  ruleDepth: number;
  onChange: (rule: RuleGroup) => void;
  onDelete: () => void;
}
export class RuleGroupEditor extends Component<Props, {}> {
  public render() {
    return (
      <EuiPanel
        className={`secRoleMapping__ruleEditorGroup--${this.props.ruleDepth % 2 ? 'odd' : 'even'}`}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={true}>
                <RuleGroupTitle
                  rule={this.props.rule}
                  onChange={this.props.onChange}
                  parentRule={this.props.parentRule}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="danger"
                  onClick={this.props.onDelete}
                  size="s"
                  data-test-subj="deleteRuleGroupButton"
                >
                  <FormattedMessage
                    id="xpack.security.management.editRoleMapping.deleteRuleGroupButton"
                    defaultMessage="Delete rule group"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {this.renderSubRules()}
          {this.props.allowAdd && this.props.rule.canAddRule() && (
            <EuiFlexItem>
              <AddRuleButton onClick={this.onAddRuleClick} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  private renderSubRules = () => {
    return this.props.rule.getRules().map((subRule, subRuleIndex, rules) => {
      const isLastRule = subRuleIndex === rules.length - 1;
      const divider = isLastRule ? null : (
        <EuiFlexItem grow={false}>
          <EuiHorizontalRule margin="m" />
        </EuiFlexItem>
      );

      if (isRuleGroup(subRule)) {
        return (
          <Fragment key={subRuleIndex}>
            <EuiFlexItem>
              <RuleGroupEditor
                rule={subRule as RuleGroup}
                parentRule={this.props.rule}
                allowAdd={this.props.allowAdd}
                ruleDepth={this.props.ruleDepth + 1}
                onChange={updatedSubRule => {
                  const updatedRule = this.props.rule.clone() as RuleGroup;
                  updatedRule.replaceRule(subRuleIndex, updatedSubRule);
                  this.props.onChange(updatedRule);
                }}
                onDelete={() => {
                  const updatedRule = this.props.rule.clone() as RuleGroup;
                  updatedRule.removeRule(subRuleIndex);
                  this.props.onChange(updatedRule);
                }}
              />
            </EuiFlexItem>
            {divider}
          </Fragment>
        );
      }

      return (
        <Fragment key={subRuleIndex}>
          <EuiFlexItem>
            <FieldRuleEditor
              rule={subRule as FieldRule}
              onChange={updatedSubRule => {
                const updatedRule = this.props.rule.clone() as RuleGroup;
                updatedRule.replaceRule(subRuleIndex, updatedSubRule);
                this.props.onChange(updatedRule);
              }}
              allowDelete={this.props.rule.canRemoveRule()}
              onDelete={() => {
                const updatedRule = this.props.rule.clone() as RuleGroup;
                updatedRule.removeRule(subRuleIndex);
                this.props.onChange(updatedRule);
              }}
            />
          </EuiFlexItem>
          {divider}
        </Fragment>
      );
    });
  };

  private onAddRuleClick = (newRule: Rule) => {
    const updatedRule = this.props.rule.clone() as RuleGroup;
    updatedRule.addRule(newRule);
    this.props.onChange(updatedRule);
  };
}
