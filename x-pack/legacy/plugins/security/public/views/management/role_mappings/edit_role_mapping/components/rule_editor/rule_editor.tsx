/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import {
  RoleMapping,
  RoleMappingRule,
  RoleMappingFieldRule,
  RoleMappingExceptRule,
  RoleMappingAnyRule,
  RoleMappingAllRule,
} from '../../../../../../../common/model';
import { FieldRuleEditor } from './field_rule_editor';
import { AnyRuleEditor } from './any_rule_editor';
import { AllRuleEditor } from './all_rule_editor';
import { ExceptRuleEditor } from './except_rule_editor';
import { AddRuleButton } from './add_rule_button';

import 'brace/mode/json';
import 'brace/theme/github';

interface Props {
  roleMapping: RoleMapping;
  onChange: (roleMapping: RoleMapping) => void;
}

export class RuleEditor extends Component<Props, void> {
  public render() {
    if (this.hasRule(this.props.roleMapping.rules)) {
      return this.renderRule(this.props.roleMapping.rules, 0, this.onRuleChange, this.onRuleDelete);
    }

    return (
      <EuiEmptyPrompt
        title={<h3>No rules defined</h3>}
        body={<div>Add a rule to control which users should be assigned roles.</div>}
        actions={
          <AddRuleButton
            onClick={newRule => {
              this.props.onChange({
                ...this.props.roleMapping,
                rules: newRule,
              });
            }}
          />
        }
      />
    );
  }

  private hasRule(entry: RoleMapping['rules']): entry is RoleMappingRule {
    return Object.keys(entry).length > 0;
  }

  private onRuleChange = (updatedRule: RoleMappingRule) => {
    this.props.onChange({
      ...this.props.roleMapping,
      rules: updatedRule,
    });
  };

  private onRuleDelete = () => {
    this.props.onChange({
      ...this.props.roleMapping,
      rules: {},
    });
  };

  private renderRule = (
    rule: RoleMappingRule,
    ruleDepth: number,
    onChange: (updatedRule: RoleMappingRule) => void,
    onDelete: () => void,
    extraProps: Record<string, any> = {}
  ) => {
    const entries = Object.keys(rule);
    if (entries.length > 1) {
      throw new Error(`Expected at most one rule, but found ${entries.length}`);
    }
    const ruleType = entries[0];
    const editor = this.getEditorForRuleType(
      ruleType,
      rule,
      onChange,
      onDelete,
      extraProps,
      ruleDepth
    );

    return (
      <EuiFlexGroup className="secRoleMapping__rule">
        <EuiFlexItem grow={1}>{editor}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon iconType="trash" color="danger" onClick={onDelete} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  private getEditorForRuleType(
    ruleType: string,
    ruleDefinition: RoleMappingRule,
    onChange: (updatedRule: RoleMappingRule) => void,
    onDelete: () => void,
    extraProps: Record<string, any>,
    ruleDepth: number
  ) {
    switch (ruleType) {
      case 'field':
        return (
          <FieldRuleEditor
            rule={ruleDefinition as RoleMappingFieldRule}
            onChange={value => onChange(value)}
            {...extraProps}
          />
        );
      case 'except':
        return (
          <ExceptRuleEditor
            rule={ruleDefinition as RoleMappingExceptRule}
            ruleDepth={ruleDepth}
            onChange={value => onChange(value)}
            onDelete={onDelete}
            renderRule={this.renderRule}
            {...extraProps}
          />
        );
      case 'any':
        return (
          <AnyRuleEditor
            rule={ruleDefinition as RoleMappingAnyRule}
            ruleDepth={ruleDepth}
            onChange={value => onChange(value)}
            renderRule={this.renderRule}
            {...extraProps}
          />
        );
      case 'all':
        return (
          <AllRuleEditor
            rule={ruleDefinition as RoleMappingAllRule}
            ruleDepth={ruleDepth}
            onChange={value => onChange(value)}
            renderRule={this.renderRule}
            {...extraProps}
          />
        );
      default:
        return <div>Unsupported rule type: {ruleType}</div>;
    }
  }
}
