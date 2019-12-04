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
import { BaseRuleGroup, BaseRule, createRuleForType } from '../../../model';

interface Props {
  rule: BaseRuleGroup;
  readonly?: boolean;
  parentRule?: BaseRule;
  onChange: (rule: BaseRuleGroup) => void;
}

// TODO: Cleanup
const rules = ['all', 'any'].map(
  type => createRuleForType(type, undefined, null, [], 0).rules
) as BaseRule[];

const exceptRules = ['all', 'any', 'field'].map(
  type => createRuleForType(type, undefined, 'except', [], 0).rules
) as BaseRule[];

export const RuleGroupTitle = (props: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [showConfirmChangeModal, setShowConfirmChangeModal] = useState(false);
  const [pendingNewRule, setPendingNewRule] = useState<BaseRuleGroup | null>(null);

  const canUseExcept = props.parentRule && props.parentRule.getType() === 'all';

  const availableRuleTypes = [...rules, ...(canUseExcept ? exceptRules : [])];

  const onChange = (newRule: BaseRuleGroup) => {
    const currentSubRules = props.rule.getRules();
    const areSubRulesValid = currentSubRules.every(subRule => newRule.canContainRule(subRule));
    if (areSubRulesValid) {
      const clone = newRule.clone() as BaseRuleGroup;
      currentSubRules.forEach(subRule => clone.addRule(subRule));

      props.onChange(clone);
      setIsMenuOpen(false);
    } else {
      setPendingNewRule(newRule);
      setShowConfirmChangeModal(true);
    }
  };

  const changeRuleDiscardingSubRules = (newRule: BaseRuleGroup) => {
    props.onChange(newRule.clone() as BaseRuleGroup);
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
