/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { EuiEmptyPrompt, EuiCallOut, EuiSpacer, EuiButton } from '@elastic/eui';
import { FieldRuleEditor } from './field_rule_editor';
import { AddRuleButton } from './add_rule_button';
import { RuleGroupEditor } from './rule_group_editor';
import { VISUAL_MAX_RULE_DEPTH } from '../../services/role_mapping_constants';
import { Rule, FieldRule, RuleGroup } from '../../../model';

interface Props {
  rules: Rule | null;
  maxDepth: number;
  onChange: (rules: Rule | null) => void;
  onSwitchEditorMode: () => void;
}

export class VisualRuleEditor extends Component<Props, {}> {
  public render() {
    if (this.props.rules) {
      const rules = this.renderRule(this.props.rules, this.onRuleChange);
      return (
        <Fragment>
          {this.getRuleDepthWarning()}
          {rules}
        </Fragment>
      );
    }

    return (
      <EuiEmptyPrompt
        title={<h3>No rules defined</h3>}
        body={<div>Add a rule to control which users should be assigned roles.</div>}
        data-test-subj="roleMappingsNoRulesDefined"
        actions={
          <AddRuleButton
            autoAdd={true}
            onClick={newRule => {
              this.props.onChange(newRule);
            }}
          />
        }
      />
    );
  }

  private canUseVisualEditor = () => this.props.maxDepth < VISUAL_MAX_RULE_DEPTH;

  private getRuleDepthWarning = () => {
    if (this.canUseVisualEditor()) {
      return null;
    }
    return (
      <Fragment>
        <EuiCallOut
          iconType="alert"
          title="Switch to advanced editor"
          data-test-subj="roleMappingsRulesTooComplex"
        >
          <p>
            Role mapping rules are too complex for the visual editor. Switch to the advanced editor
            to continue editing this rule.
          </p>

          <EuiButton onClick={this.props.onSwitchEditorMode} size="s">
            Use advanced editor
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </Fragment>
    );
  };

  private onRuleChange = (updatedRule: Rule) => {
    this.props.onChange(updatedRule);
  };

  private onRuleDelete = () => {
    this.props.onChange(null);
  };

  private renderRule = (rule: Rule, onChange: (updatedRule: Rule) => void) => {
    return this.getEditorForRuleType(rule, onChange);
  };

  private getEditorForRuleType(rule: Rule, onChange: (updatedRule: Rule) => void) {
    switch (rule.getType()) {
      case 'field':
        return (
          <FieldRuleEditor
            rule={rule as FieldRule}
            onChange={value => onChange(value)}
            allowAdd={this.canUseVisualEditor()}
            allowDelete={true}
            onDelete={this.onRuleDelete}
          />
        );
      case 'except':
      case 'any':
      case 'all':
        return (
          <RuleGroupEditor
            rule={rule as RuleGroup}
            ruleDepth={0}
            allowAdd={this.canUseVisualEditor()}
            onChange={value => onChange(value)}
            onDelete={this.onRuleDelete}
          />
        );
      default:
        throw new Error(`Unsupported rule type: ${rule.getType()}`);
    }
  }
}
