/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiBadge, useEuiTheme } from '@elastic/eui';
import React from 'react';
import {
  type Condition,
  isFilterCondition,
  isAndCondition,
  isOrCondition,
  operatorToHumanReadableNameMap,
  getFilterOperator,
  getFilterValue,
  isNeverCondition,
  isNotCondition,
  isAlwaysCondition,
} from '@kbn/streamlang';
import { i18n } from '@kbn/i18n';

export function ConditionPanel({ condition }: { condition: Condition }) {
  return (
    <EuiPanel color="subdued" hasShadow={false} hasBorder={false} paddingSize="s">
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        <EuiFlexItem grow={false}>
          <BoldText>WHERE</BoldText>
        </EuiFlexItem>
        {renderCondition(condition)}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function renderCondition(condition: Condition): React.ReactNode {
  if (isAndCondition(condition)) {
    return condition.and.reduce<React.ReactNode[]>((acc, cond, idx, arr) => {
      acc.push(renderCondition(cond));
      if (idx < arr.length - 1) {
        acc.push(
          <EuiFlexItem key={`and-separator-${idx}`} grow={false}>
            <BoldText>AND</BoldText>
          </EuiFlexItem>
        );
      }
      return acc;
    }, []);
  }
  if (isOrCondition(condition)) {
    return condition.or.reduce<React.ReactNode[]>((acc, cond, idx, arr) => {
      acc.push(renderCondition(cond));
      if (idx < arr.length - 1) {
        acc.push(
          <EuiFlexItem key={`or-separator-${idx}`} grow={false}>
            <BoldText>OR</BoldText>
          </EuiFlexItem>
        );
      }
      return acc;
    }, []);
  }
  if (isFilterCondition(condition)) {
    const field = condition.field;
    const operator = getFilterOperator(condition);
    const value = getFilterValue(condition);
    return (
      <>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{field}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {operatorToHumanReadableNameMap[operator as keyof typeof operatorToHumanReadableNameMap]}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{value?.toString()}</EuiBadge>
        </EuiFlexItem>
      </>
    );
  }
  if (isNotCondition(condition)) {
    return (
      <>
        <EuiFlexItem grow={false}>
          <BoldText>NOT</BoldText>
        </EuiFlexItem>
        {renderCondition(condition.not)}
      </>
    );
  }
  if (isNeverCondition(condition)) {
    return (
      <>
        <EuiFlexItem grow={false}>
          <SubduedText>
            {i18n.translate('xpack.streams.streamDetailRouting.conditionPanel.never', {
              defaultMessage: 'never',
            })}
          </SubduedText>
        </EuiFlexItem>
      </>
    );
  }
  if (isAlwaysCondition(condition)) {
    return (
      <>
        <EuiFlexItem grow={false}>
          <SubduedText>
            {i18n.translate('xpack.streams.streamDetailRouting.conditionPanel.always', {
              defaultMessage: 'always',
            })}
          </SubduedText>
        </EuiFlexItem>
      </>
    );
  }
  return null;
}

function BoldText({ children }: { children: React.ReactNode }) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiText
      size="s"
      style={{
        fontWeight: euiTheme.font.weight.bold,
      }}
    >
      {children}
    </EuiText>
  );
}

function SubduedText({ children }: { children: React.ReactNode }) {
  return (
    <EuiText size="s" color="subdued">
      {children}
    </EuiText>
  );
}
