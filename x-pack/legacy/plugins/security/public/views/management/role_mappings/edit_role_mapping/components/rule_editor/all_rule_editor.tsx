/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ReactElement } from 'react';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { RoleMappingRule, RoleMappingAllRule } from '../../../../../../../common/model';
import { AddRuleButton } from './add_rule_button';

interface Props {
  rule: RoleMappingAllRule;
  ruleDepth: number;
  onChange: (rule: RoleMappingAllRule) => void;
  renderRule: (
    rule: RoleMappingRule,
    ruleDepth: number,
    onChange: (updatedRule: RoleMappingRule) => void,
    onDelete: () => void
  ) => ReactElement;
  customTitle?: string;
  hideAddRuleButton?: boolean;
}
export class AllRuleEditor extends Component<Props, {}> {
  public render() {
    const { all } = this.props.rule;
    return (
      <EuiAccordion id="all" buttonContent={<p>{this.getTitle()}:</p>} paddingSize="m">
        <EuiFlexGroup
          direction="column"
          className={`secRoleMapping__ruleEditorGroup secRoleMapping__ruleEditorGroup--${
            this.props.ruleDepth % 2 ? 'odd' : 'even'
          }`}
        >
          {all.map((rule, index) => {
            return (
              <EuiFlexItem key={index}>
                {this.props.renderRule(
                  rule,
                  this.props.ruleDepth + 1,
                  this.onRuleChange(index),
                  this.onRuleDelete(index)
                )}
              </EuiFlexItem>
            );
          })}
          {!this.props.hideAddRuleButton && (
            <EuiFlexItem>
              <AddRuleButton onClick={this.onAddRuleClick} allowExceptRule={true} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiAccordion>
    );
  }

  private getTitle = () => {
    const defaultTitle = 'All of the following are true';
    return this.props.customTitle || defaultTitle;
  };

  private onRuleChange = (index: number) => (updatedRule: RoleMappingRule) => {
    const nextValue = [...this.props.rule.all];
    nextValue.splice(index, 1, updatedRule);
    this.props.onChange({ all: nextValue });
  };

  private onRuleDelete = (index: number) => () => {
    const nextValue = [...this.props.rule.all];
    nextValue.splice(index, 1);
    this.props.onChange({ all: nextValue });
  };

  private onAddRuleClick = (newRule: RoleMappingRule) => {
    const nextValue = [...this.props.rule.all, newRule];
    this.props.onChange({ all: nextValue });
  };
}
