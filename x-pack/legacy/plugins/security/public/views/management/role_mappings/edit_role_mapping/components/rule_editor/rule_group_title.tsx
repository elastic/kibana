/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiLink,
  EuiIcon,
  EuiOverlayMask,
  EuiConfirmModal,
} from '@elastic/eui';
import {
  RuleGroup,
  Rule,
  AllRule,
  AnyRule,
  ExceptAllRule,
  ExceptAnyRule,
  ExceptFieldRule,
} from '../../../model';

interface Props {
  rule: RuleGroup;
  readonly?: boolean;
  parentRule?: Rule;
  onChange: (rule: RuleGroup) => void;
}

const rules = [new AllRule(), new AnyRule()];
const exceptRules = [new ExceptAllRule(), new ExceptAnyRule(), new ExceptFieldRule()];

export const RuleGroupTitle = (props: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [showConfirmChangeModal, setShowConfirmChangeModal] = useState(false);
  const [pendingNewRule, setPendingNewRule] = useState<RuleGroup | null>(null);

  const canUseExcept = props.parentRule && props.parentRule.getType() === 'all';

  const availableRuleTypes = [...rules, ...(canUseExcept ? exceptRules : [])];

  const onChange = (newRule: RuleGroup) => {
    const currentSubRules = props.rule.getRules();
    const areSubRulesValid = currentSubRules.every(subRule => newRule.canContainRule(subRule));
    if (areSubRulesValid) {
      const clone = newRule.clone() as RuleGroup;
      currentSubRules.forEach(subRule => clone.addRule(subRule));

      props.onChange(clone);
      setIsMenuOpen(false);
    } else {
      setPendingNewRule(newRule);
      setShowConfirmChangeModal(true);
    }
  };

  const changeRuleDiscardingSubRules = (newRule: RuleGroup) => {
    props.onChange(newRule.clone() as RuleGroup);
    setIsMenuOpen(false);
  };

  const ruleButton = (
    <EuiLink onClick={() => setIsMenuOpen(!isMenuOpen)}>
      {props.rule.getDisplayTitle()} <EuiIcon type="arrowDown" />
    </EuiLink>
  );

  const ruleTypeSelector = (
    <EuiPopover button={ruleButton} isOpen={isMenuOpen} closePopover={() => setIsMenuOpen(false)}>
      <EuiContextMenuPanel
        items={availableRuleTypes.map((rt, index) => {
          const isSelected = rt.getDisplayTitle() === props.rule.getDisplayTitle();
          const icon = isSelected ? 'check' : undefined;
          return (
            <EuiContextMenuItem key={index} icon={icon} onClick={() => onChange(rt as RuleGroup)}>
              {rt.getDisplayTitle()}
            </EuiContextMenuItem>
          );
        })}
      />
    </EuiPopover>
  );

  const confirmChangeModal = showConfirmChangeModal ? (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={'Switch with invalid rules?'}
        onCancel={() => {
          setShowConfirmChangeModal(false);
          setPendingNewRule(null);
        }}
        onConfirm={() => {
          setShowConfirmChangeModal(false);
          changeRuleDiscardingSubRules(pendingNewRule!);
          setPendingNewRule(null);
        }}
        cancelButtonText={'Cancel'}
        confirmButtonText={'Switch anyway'}
      >
        <p>
          This group contains rules which are not compatible. If you switch, you will lose all rules
          within this group.
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  ) : null;

  return (
    <h3>
      {ruleTypeSelector}
      {confirmChangeModal}
    </h3>
  );
};
