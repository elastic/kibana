/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FieldRuleEditor } from './field_rule_editor';
import { AddRuleButton } from './add_rule_button';

import { BaseRule } from '../../../../../../../common/model/role_mappings/base_rule';
import { RuleGroupEditor } from './rule_group_editor';
import { BaseRuleGroup } from '../../../../../../../common/model/role_mappings/base_rule_group';
import { FieldRule } from '../../../../../../../common/model/role_mappings/field_rule';

interface Props {
  rules: BaseRule | null;
  onChange: (rules: BaseRule | null) => void;
}

export class VisualRuleEditor extends Component<Props, {}> {
  public render() {
    if (this.props.rules) {
      return this.renderRule(this.props.rules, 0, this.onRuleChange, this.onRuleDelete);
    }

    return (
      <EuiEmptyPrompt
        title={<h3>No rules defined</h3>}
        body={<div>Add a rule to control which users should be assigned roles.</div>}
        actions={
          <AddRuleButton
            onClick={newRule => {
              this.props.onChange(newRule);
            }}
          />
        }
      />
    );
  }

  private onRuleChange = (updatedRule: BaseRule) => {
    this.props.onChange(updatedRule);
  };

  private onRuleDelete = () => {
    this.props.onChange(null);
  };

  private renderRule = (
    rule: BaseRule,
    ruleDepth: number,
    onChange: (updatedRule: BaseRule) => void,
    onDelete: () => void,
    extraProps: Record<string, any> = {}
  ) => {
    return this.getEditorForRuleType(rule, onChange, onDelete, extraProps, ruleDepth);
  };

  private getEditorForRuleType(
    rule: BaseRule,
    onChange: (updatedRule: BaseRule) => void,
    onDelete: () => void,
    extraProps: Record<string, any>,
    ruleDepth: number
  ) {
    switch (rule.getType()) {
      case 'field':
        return (
          <FieldRuleEditor
            rule={rule as FieldRule}
            onChange={value => onChange(value)}
            onDelete={this.onRuleDelete}
            {...extraProps}
          />
        );
      case 'except':
      case 'any':
      case 'all':
        return (
          <RuleGroupEditor
            rule={rule as BaseRuleGroup}
            ruleDepth={ruleDepth}
            onChange={value => onChange(value)}
            onDelete={this.onRuleDelete}
          />
        );
      default:
        return <div>Unsupported rule type: {rule.getType()}</div>;
    }
  }
}
