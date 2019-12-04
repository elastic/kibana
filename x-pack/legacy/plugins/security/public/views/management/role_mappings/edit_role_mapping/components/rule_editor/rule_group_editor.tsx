/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { BaseRule } from '../../../../../../../common/model/role_mappings/base_rule';
import { FieldRule } from '../../../../../../../common/model/role_mappings/field_rule';
import { BaseRuleGroup } from '../../../../../../../common/model/role_mappings/base_rule_group';
import { AddRuleButton } from './add_rule_button';
import { RuleGroupTitle } from './rule_group_title';
import { FieldRuleEditor } from './field_rule_editor';

interface Props {
  rule: BaseRuleGroup;
  allowAdd: boolean;
  parentRule?: BaseRule;
  ruleDepth: number;
  onChange: (rule: BaseRuleGroup) => void;
  onDelete: () => void;
}
export class RuleGroupEditor extends Component<Props, {}> {
  public render() {
    return (
      <EuiPanel>
        <EuiFlexGroup
          direction="column"
          className={`secRoleMapping__ruleEditorGroup secRoleMapping__ruleEditorGroup--${
            this.props.ruleDepth % 2 ? 'odd' : 'even'
          }`}
        >
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <RuleGroupTitle
                  rule={this.props.rule}
                  onChange={this.props.onChange}
                  parentRule={this.props.parentRule}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon iconType="trash" color="danger" onClick={this.props.onDelete} />
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
    return this.props.rule.getRules().map((subRule, subRuleIndex) => {
      switch (subRule.getType()) {
        case 'field':
          return (
            <EuiFlexItem key={subRuleIndex}>
              <FieldRuleEditor
                rule={subRule as FieldRule}
                onChange={updatedSubRule => {
                  const updatedRule = this.props.rule.clone() as BaseRuleGroup;
                  updatedRule.replaceRule(subRuleIndex, updatedSubRule);
                  this.props.onChange(updatedRule);
                }}
                allowAdd={this.props.allowAdd}
                allowDelete={this.props.rule.canRemoveRule()}
                onDelete={() => {
                  const updatedRule = this.props.rule.clone() as BaseRuleGroup;
                  updatedRule.removeRule(subRuleIndex);
                  this.props.onChange(updatedRule);
                }}
              />
            </EuiFlexItem>
          );
        case 'except':
        case 'any':
        case 'all':
          return (
            <EuiFlexItem key={subRuleIndex}>
              <RuleGroupEditor
                rule={subRule as BaseRuleGroup}
                parentRule={this.props.rule}
                allowAdd={this.props.allowAdd}
                ruleDepth={this.props.ruleDepth + 1}
                onChange={updatedSubRule => {
                  const updatedRule = this.props.rule.clone() as BaseRuleGroup;
                  updatedRule.replaceRule(subRuleIndex, updatedSubRule);
                  this.props.onChange(updatedRule);
                }}
                onDelete={() => {
                  const updatedRule = this.props.rule.clone() as BaseRuleGroup;
                  updatedRule.removeRule(subRuleIndex);
                  this.props.onChange(updatedRule);
                }}
              />
            </EuiFlexItem>
          );
        default:
          return <div>Unsupported rule type: {subRule.getType()}</div>;
      }
    });
  };

  private onAddRuleClick = (newRule: BaseRule) => {
    const updatedRule = this.props.rule.clone() as BaseRuleGroup;
    updatedRule.addRule(newRule);
    this.props.onChange(updatedRule);
  };
}
