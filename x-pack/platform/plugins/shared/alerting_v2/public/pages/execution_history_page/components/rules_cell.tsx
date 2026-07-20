/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadgeGroup,
  EuiBadge,
  EuiCallOut,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import type { PolicyExecutionHistoryItem } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';

interface Props {
  rules: PolicyExecutionHistoryItem['rules'];
  maxVisibleRules?: number;
  totalRuleCount: number;
  activeRuleId: string | null;
  onRuleClick: (ruleId: string) => void;
  canReadRules: boolean;
}

const RULE_BADGE_MAX_WIDTH = 200;

export const RulesCell = ({
  rules,
  maxVisibleRules = 3,
  totalRuleCount,
  activeRuleId,
  onRuleClick,
  canReadRules,
}: Props) => {
  const getClickProps = useCallback(
    (ruleId: string, label: string) =>
      canReadRules ? { onClick: () => onRuleClick(ruleId), onClickAriaLabel: label } : {},
    [canReadRules, onRuleClick]
  );

  if (totalRuleCount === 0) return null;
  const visible = rules.slice(0, maxVisibleRules);
  const hiddenRules = rules.slice(maxVisibleRules);
  const notShownCount = totalRuleCount - rules.length;
  const overflowCount = hiddenRules.length + notShownCount;
  return (
    <EuiBadgeGroup gutterSize="xs">
      {visible.map((rule) => {
        const isActive = rule.id === activeRuleId;
        const label = rule.name ?? rule.id;
        const clickProps = getClickProps(rule.id, label);
        return (
          <EuiBadge
            key={rule.id}
            color={isActive ? 'primary' : 'hollow'}
            iconType="bell"
            css={{ maxWidth: `${RULE_BADGE_MAX_WIDTH}px` }}
            {...clickProps}
          >
            {label}
          </EuiBadge>
        );
      })}
      {overflowCount > 0 && (
        <OverflowPopover
          hiddenRules={hiddenRules}
          notShownCount={notShownCount}
          onRuleClick={onRuleClick}
          canReadRules={canReadRules}
        />
      )}
    </EuiBadgeGroup>
  );
};

const OverflowPopover = ({
  hiddenRules,
  notShownCount,
  onRuleClick,
  canReadRules,
}: {
  hiddenRules: PolicyExecutionHistoryItem['rules'];
  notShownCount: number;
  onRuleClick: (ruleId: string) => void;
  canReadRules: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const total = hiddenRules.length + notShownCount;

  const getRuleClickHandler = useCallback(
    (ruleId: string) =>
      canReadRules
        ? () => {
            setIsOpen(false);
            onRuleClick(ruleId);
          }
        : undefined,
    [canReadRules, onRuleClick]
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downCenter"
      button={
        <EuiBadge
          color="hollow"
          onClick={() => setIsOpen((v) => !v)}
          onClickAriaLabel={i18n.translate(
            'xpack.alertingV2.executionHistory.columns.rules.overflowAria',
            {
              defaultMessage: 'Show {count, plural, one {# more rule} other {# more rules}}',
              values: { count: total },
            }
          )}
        >
          {`+${total}`}
        </EuiBadge>
      }
    >
      <EuiPopoverTitle paddingSize="s">
        {i18n.translate('xpack.alertingV2.executionHistory.columns.rules.overflowTitle', {
          defaultMessage: 'More rules',
        })}
      </EuiPopoverTitle>
      <div css={{ maxHeight: 320, overflowY: 'auto', minWidth: 240, maxWidth: 360 }}>
        <EuiListGroup maxWidth={false}>
          {hiddenRules.map((rule) => {
            const label = rule.name ?? rule.id;
            return (
              <EuiListGroupItem
                key={rule.id}
                iconType="bell"
                label={label}
                title={label}
                onClick={getRuleClickHandler(rule.id)}
              />
            );
          })}
        </EuiListGroup>
        {notShownCount > 0 && (
          <EuiCallOut
            size="s"
            iconType="warning"
            color="warning"
            title={i18n.translate(
              'xpack.alertingV2.executionHistory.columns.rules.overflowNotShown',
              {
                defaultMessage:
                  '{count, plural, one {# more rule not shown} other {# more rules not shown}}. Use the rule filter to narrow.',
                values: { count: notShownCount },
              }
            )}
          />
        )}
      </div>
    </EuiPopover>
  );
};
