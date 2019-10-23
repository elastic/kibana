/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ReactElement } from 'react';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { RoleMappingAnyRule, RoleMappingRule } from '../../../../../../../common/model';
import { AddRuleButton } from './add_rule_button';

interface Props {
  rule: RoleMappingAnyRule;
  ruleDepth: number;
  onChange: (rule: RoleMappingAnyRule) => void;
  renderRule: (
    rule: RoleMappingRule,
    ruleDepth: number,
    onChange: (updatedRule: RoleMappingRule) => void,
    onDelete: () => void
  ) => ReactElement;
  customTitle?: string;
  hideAddRuleButton?: boolean;
}
export class AnyRuleEditor extends Component<Props, {}> {
  public render() {
    const { any } = this.props.rule;
    return (
      <EuiAccordion id="any" buttonContent={<p>{this.getTitle()}:</p>} paddingSize="m">
        <EuiFlexGroup
          direction="column"
          className={`secRoleMapping__ruleEditorGroup secRoleMapping__ruleEditorGroup--${
            this.props.ruleDepth % 2 ? 'odd' : 'even'
          }`}
        >
          {any.map((rule, index) => {
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
              <AddRuleButton onClick={this.onAddRuleClick} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiAccordion>
    );
  }

  private getTitle = () => {
    const defaultTitle = 'Any of the following are true';

    return this.props.customTitle || defaultTitle;
  };

  private onRuleChange = (index: number) => (updatedRule: RoleMappingRule) => {
    const nextValue = [...this.props.rule.any];
    nextValue.splice(index, 1, updatedRule);
    this.props.onChange({ any: nextValue });
  };

  private onRuleDelete = (index: number) => () => {
    const nextValue = [...this.props.rule.any];
    nextValue.splice(index, 1);
    this.props.onChange({ any: nextValue });
  };

  private onAddRuleClick = (newRule: RoleMappingRule) => {
    const nextValue = [...this.props.rule.any, newRule];
    this.props.onChange({ any: nextValue });
  };
}
