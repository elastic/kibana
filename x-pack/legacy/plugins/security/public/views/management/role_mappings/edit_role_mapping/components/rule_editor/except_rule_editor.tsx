/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ReactElement } from 'react';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  RoleMappingRule,
  RoleMappingExceptRule,
  RoleMappingAllRule,
  RoleMappingAnyRule,
  RoleMappingFieldRule,
} from '../../../../../../../common/model';

interface Props {
  rule: RoleMappingExceptRule;
  ruleDepth: number;
  onChange: (rule: RoleMappingExceptRule) => void;
  onDelete: () => void;
  renderRule: (
    rule: RoleMappingRule,
    ruleDepth: number,
    onChange: (updatedRule: RoleMappingRule) => void,
    onDelete: () => void,
    extraProps?: Record<string, any>
  ) => ReactElement;
}
export class ExceptRuleEditor extends Component<Props, {}> {
  public render() {
    const { except } = this.props.rule;

    const isGroupedRule = Boolean(
      (except as RoleMappingAllRule).all || (except as RoleMappingAnyRule).any
    );
    if (isGroupedRule) {
      return this.props.renderRule(
        except,
        this.props.ruleDepth,
        this.onRuleChange,
        this.onRuleDelete,
        {
          customTitle: this.getRuleDescription(except),
        }
      );
    }

    return (
      <EuiAccordion
        id="except"
        buttonContent={<p>{this.getRuleDescription(except)}:</p>}
        paddingSize="m"
      >
        <EuiFlexGroup
          direction="column"
          className={`secRoleMapping__ruleEditorGroup--${
            this.props.ruleDepth % 2 ? 'odd' : 'even'
          }`}
        >
          <EuiFlexItem>
            {this.props.renderRule(
              except,
              this.props.ruleDepth + 1,
              this.onRuleChange,
              this.onRuleDelete
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    );
  }

  private getRuleDescription = (rule: RoleMappingRule) => {
    if ((rule as RoleMappingAllRule).all) {
      return `Any of the following are false`;
    }
    if ((rule as RoleMappingAnyRule).any) {
      return `None of the following are true`;
    }
    if ((rule as RoleMappingFieldRule).field) {
      return `The following is false`;
    }
  };

  private onRuleChange = (updatedRule: RoleMappingRule) => {
    this.props.onChange({ except: updatedRule });
  };

  private onRuleDelete = () => {
    this.props.onDelete();
  };
}
