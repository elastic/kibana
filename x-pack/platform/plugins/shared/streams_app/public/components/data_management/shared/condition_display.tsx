/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiText, EuiBadge } from '@elastic/eui';
import type { Condition, FilterCondition } from '@kbn/streamlang';
import {
  getFilterOperator,
  getFilterValue,
  isFilterConditionObject,
  isAlwaysCondition,
  isNeverCondition,
  isAndCondition,
  isOrCondition,
  isNotCondition,
  operatorToHumanReadableNameMap,
} from '@kbn/streamlang';

interface ConditionDisplayProps {
  condition: Condition;
  showKeyword?: boolean;
  keyword?: string;
}

export const ConditionDisplay = ({
  condition,
  showKeyword = false,
  keyword = 'WHERE',
}: ConditionDisplayProps) => {
  if (isAlwaysCondition(condition) || isNeverCondition(condition)) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
      {showKeyword && <OperatorText operator={keyword} />}
      <RecursiveConditionDisplay condition={condition} />
    </EuiFlexGroup>
  );
};

const FilterBadges = ({ condition }: { condition: FilterCondition }) => {
  const operator = getFilterOperator(condition);
  const value = getFilterValue(condition);
  const field = condition.field;

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
};

const RecursiveConditionDisplay = ({ condition }: { condition: Condition }) => {
  const renderConditionsWithOperator = (conditions: Condition[], operator: string) => (
    <>
      {conditions.map((subCondition, index) => (
        <React.Fragment key={index}>
          {index > 0 && <OperatorText operator={operator} />}
          <RecursiveConditionDisplay condition={subCondition} />
        </React.Fragment>
      ))}
    </>
  );

  if (isAndCondition(condition)) {
    return renderConditionsWithOperator(condition.and, 'AND');
  }

  if (isOrCondition(condition)) {
    return renderConditionsWithOperator(condition.or, 'OR');
  }

  if (isNotCondition(condition)) {
    return (
      <>
        <OperatorText operator="NOT" />
        <RecursiveConditionDisplay condition={condition.not} />
      </>
    );
  }

  if (isFilterConditionObject(condition)) {
    return <FilterBadges condition={condition as FilterCondition} />;
  }

  // Fallback for any unknown condition types
  return (
    <EuiFlexItem grow={false}>
      <EuiBadge>{JSON.stringify(condition)}</EuiBadge>
    </EuiFlexItem>
  );
};

const OperatorText = ({ operator }: { operator: string }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem grow={false}>
      <EuiText size="s" style={{ fontWeight: euiTheme.font.weight.bold }}>
        {operator}
      </EuiText>
    </EuiFlexItem>
  );
};
