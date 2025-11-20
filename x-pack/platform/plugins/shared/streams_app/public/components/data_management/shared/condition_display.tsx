/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  useEuiTheme,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiBadge,
  EuiToolTip,
} from '@elastic/eui';
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
import { css } from '@emotion/css';
import { ConditionEditor } from './condition_editor';

export const ConditionPanel = ({
  condition,
  keywordWrapper,
}: {
  condition: Condition;
  keywordWrapper?: (children: React.ReactNode) => React.ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      color="subdued"
      paddingSize="s"
      className={css`
        border-radius: ${euiTheme.size.s};
      `}
    >
      <ConditionDisplay
        condition={condition}
        showKeyword={true}
        keyword="WHERE"
        keywordWrapper={keywordWrapper}
      />
    </EuiPanel>
  );
};

export const EditableConditionPanel = ({
  condition,
  isEditingCondition,
  setCondition,
}: {
  condition: Condition;
  isEditingCondition: boolean;
  setCondition: (condition: Condition) => void;
}) => {
  return isEditingCondition ? (
    <ConditionEditor condition={condition} status="enabled" onConditionChange={setCondition} />
  ) : (
    <ConditionPanel condition={condition} />
  );
};

interface ConditionDisplayProps {
  condition: Condition;
  showKeyword?: boolean;
  keyword?: string;
  keywordWrapper?: (children: React.ReactNode) => React.ReactNode;
}

export const ConditionDisplay = ({
  condition,
  showKeyword = false,
  keyword = 'WHERE',
  keywordWrapper = (children: React.ReactNode) => children,
}: ConditionDisplayProps) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
      {showKeyword && keywordWrapper(<OperatorText operator={keyword} bold />)}
      <RecursiveConditionDisplay condition={condition} />
    </EuiFlexGroup>
  );
};

const FilterBadges = ({ condition }: { condition: FilterCondition }) => {
  const operator = getFilterOperator(condition);
  const value = getFilterValue(condition);
  const field = condition.field;
  const operatorText =
    operatorToHumanReadableNameMap[operator as keyof typeof operatorToHumanReadableNameMap];

  return (
    <>
      <BadgeItem text={field} />
      <OperatorText operator={operatorText} subdued />
      <BadgeItem text={value?.toString() ?? ''} />
    </>
  );
};

const BadgeItem = ({ text }: { text: string }) => (
  <EuiFlexItem grow={false}>
    <EuiBadge color="hollow">{text}</EuiBadge>
  </EuiFlexItem>
);

const RecursiveConditionDisplay = ({
  condition,
  needsParentheses = false,
}: {
  condition: Condition;
  needsParentheses?: boolean;
}) => {
  const renderConditionsWithOperator = (conditions: Condition[], operator: string) => (
    <>
      {conditions.map((subCondition, index) => {
        // Only add parentheses when mixing different operator types
        const needsParens =
          (operator === 'AND' && isOrCondition(subCondition)) ||
          (operator === 'OR' && isAndCondition(subCondition));

        return (
          <React.Fragment key={index}>
            {index > 0 && <OperatorText operator={operator} bold />}
            <RecursiveConditionDisplay condition={subCondition} needsParentheses={needsParens} />
          </React.Fragment>
        );
      })}
    </>
  );

  const content = () => {
    if (isAndCondition(condition)) {
      return renderConditionsWithOperator(condition.and, 'AND');
    }

    if (isOrCondition(condition)) {
      return renderConditionsWithOperator(condition.or, 'OR');
    }

    if (isNotCondition(condition)) {
      return (
        <>
          <OperatorText operator="NOT" bold />
          <RecursiveConditionDisplay
            condition={condition.not}
            needsParentheses={isAndCondition(condition.not) || isOrCondition(condition.not)}
          />
        </>
      );
    }

    if (isAlwaysCondition(condition)) {
      return <BadgeItem text="always" />;
    }

    if (isNeverCondition(condition)) {
      return <BadgeItem text="never" />;
    }

    if (isFilterConditionObject(condition)) {
      return <FilterBadges condition={condition} />;
    }

    // Fallback for any unknown condition types
    const jsonStringifiedCondition = JSON.stringify(condition);
    return (
      <EuiToolTip
        content={jsonStringifiedCondition}
        anchorClassName={css`
          max-width: 100%;
        `}
      >
        <BadgeItem text={jsonStringifiedCondition} />
      </EuiToolTip>
    );
  };

  return (
    <>
      {needsParentheses && <OperatorText operator="(" />}
      {content()}
      {needsParentheses && <OperatorText operator=")" />}
    </>
  );
};

const OperatorText = ({
  operator,
  bold,
  subdued,
}: {
  operator: string;
  bold?: boolean;
  subdued?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem grow={false}>
      <EuiText
        size="s"
        color={subdued ? 'subdued' : 'default'}
        style={{ fontWeight: bold ? euiTheme.font.weight.bold : euiTheme.font.weight.regular }}
      >
        {operator}
      </EuiText>
    </EuiFlexItem>
  );
};
