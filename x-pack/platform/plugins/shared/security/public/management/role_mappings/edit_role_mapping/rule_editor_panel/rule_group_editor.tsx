/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Component, Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { AddRuleButton } from './add_rule_button';
import { FieldRuleEditor } from './field_rule_editor';
import { RuleGroupTitle } from './rule_group_title';
import type { FieldRule, Rule, RuleGroup } from '../../model';
import { isRuleGroup } from '../services/is_rule_group';

interface Props {
  rule: RuleGroup;
  allowAdd: boolean;
  parentRule?: RuleGroup;
  ruleDepth: number;
  onChange: (rule: RuleGroup) => void;
  onDelete: () => void;
  readOnly?: boolean;
}
export class RuleGroupEditor extends Component<Props, {}> {
  static defaultProps: Partial<Props> = {
    readOnly: false,
  };

  public render() {
    return (
      <EuiPanel
        css={({ euiTheme }) => css`
          background-color: ${this.props.ruleDepth % 2
            ? euiTheme.colors.emptyShade
            : euiTheme.colors.lightestShade};
        `}
        hasBorder={true}
        hasShadow={false}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={true}>
                <RuleGroupTitle
                  rule={this.props.rule}
                  onChange={this.props.onChange}
                  parentRule={this.props.parentRule}
                  readOnly={this.props.readOnly}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {this.props.readOnly === false && (
                  <EuiButtonEmpty
                    color="danger"
                    onClick={this.props.onDelete}
                    size="s"
                    iconType="trash"
                    data-test-subj="deleteRuleGroupButton"
                  >
                    <FormattedMessage
                      id="xpack.security.management.editRoleMapping.deleteRuleGroupButton"
                      defaultMessage="Delete"
                    />
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {this.renderSubRules()}
          {this.props.allowAdd && this.props.readOnly === false && (
            <EuiFlexItem>
              <div>
                <AddRuleButton onClick={this.onAddRuleClick} />
              </div>
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
                onChange={(updatedSubRule) => {
                  const updatedRule = this.props.rule.clone() as RuleGroup;
                  updatedRule.replaceRule(subRuleIndex, updatedSubRule);
                  this.props.onChange(updatedRule);
                }}
                onDelete={() => {
                  const updatedRule = this.props.rule.clone() as RuleGroup;
                  updatedRule.removeRule(subRuleIndex);
                  this.props.onChange(updatedRule);
                }}
                readOnly={this.props.readOnly}
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
              onChange={(updatedSubRule) => {
                const updatedRule = this.props.rule.clone() as RuleGroup;
                updatedRule.replaceRule(subRuleIndex, updatedSubRule);
                this.props.onChange(updatedRule);
              }}
              onDelete={() => {
                const updatedRule = this.props.rule.clone() as RuleGroup;
                updatedRule.removeRule(subRuleIndex);
                this.props.onChange(updatedRule);
              }}
              readOnly={this.props.readOnly}
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
