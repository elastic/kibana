/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { BaseRule } from '../../../../../../../common/model/role_mappings/base_rule';
import { createRuleForType } from '../../../../../../../common/model/role_mappings/rule_builder';
import { BaseRuleGroup } from '../../../../../../../common/model/role_mappings/base_rule_group';

interface Props {
  rule: BaseRuleGroup;
  parentRule?: BaseRule;
  onChange: (rule: BaseRuleGroup) => void;
}

const availableRules = ['all', 'any', 'field']
  .map(type => [createRuleForType(type, null, false), createRuleForType(type, null, true)])
  .flat();

export const RuleGroupTitle = (props: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const canUseExcept = props.parentRule && props.parentRule.getType() === 'all';

  const availableRuleTypes = availableRules.filter(
    rt => rt instanceof BaseRuleGroup && (!rt.isNegated || canUseExcept)
  );

  const onChange = (newRule: BaseRuleGroup) => {
    props.onChange(newRule.clone() as BaseRuleGroup);
    setIsMenuOpen(false);
  };

  const ruleButton = (
    <EuiButtonEmpty
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setIsMenuOpen(!isMenuOpen)}
    >
      {props.rule.getDisplayTitle()}
    </EuiButtonEmpty>
  );

  const ruleTypeSelector = (
    <EuiPopover button={ruleButton} isOpen={isMenuOpen} closePopover={() => setIsMenuOpen(false)}>
      <EuiContextMenuPanel
        items={availableRuleTypes.map((rt, index) => {
          const isSelected =
            rt.getType() === props.rule.getType() && rt.isNegated === props.rule.isNegated;
          const icon = isSelected ? 'check' : undefined;
          return (
            <EuiContextMenuItem
              key={index}
              icon={icon}
              onClick={() => onChange(rt as BaseRuleGroup)}
            >
              {rt.getDisplayTitle()}
            </EuiContextMenuItem>
          );
        })}
      />
    </EuiPopover>
  );

  return <h3>{ruleTypeSelector}</h3>;
};
