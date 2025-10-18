/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme, EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText, EuiBadge } from '@elastic/eui';
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

export const ConditionPanel = ({ condition }: { condition: Condition }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      color="subdued"
      paddingSize="s"
      className={css`
        border-radius: ${euiTheme.size.s};
      `}
    >
      <ConditionDisplay condition={condition} showKeyword={true} keyword="WHERE" />
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
  onClick?: () => void;
  isActive?: boolean;
}

export const ConditionDisplay = ({
  condition,
  showKeyword = false,
  keyword = 'WHERE',
  onClick,
  isActive = false,
}: ConditionDisplayProps) => {
  const { euiTheme } = useEuiTheme();
  const isInteractive = Boolean(onClick);
  const isHighlighted = isInteractive && isActive;

  const content = (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
      {showKeyword && <OperatorText operator={keyword} bold isHighlighted={isHighlighted} />}
      <RecursiveConditionDisplay condition={condition} isHighlighted={isHighlighted} />
    </EuiFlexGroup>
  );

  if (!isInteractive) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={() => onClick?.()}
      aria-pressed={isHighlighted}
      className={css`
        display: block;
        width: 100%;
        border: none;
        background: ${
          isHighlighted ? euiTheme.colors.backgroundBasePrimary : 'transparent'
        };
        color: ${isHighlighted ? euiTheme.colors.primary : 'inherit'};
        padding: ${euiTheme.size.xxs};
        border-radius: ${euiTheme.border.radius.medium};
        cursor: pointer;
        text-align: left;

        &:focus {
          outline: none;
        }

        &:focus-visible {
          outline: ${euiTheme.border.width.thin} solid ${euiTheme.colors.primary};
          outline-offset: 0;
        }
      `}
    >
      {content}
    </button>
  );
};

const FilterBadges = ({
  condition,
  isHighlighted,
}: {
  condition: FilterCondition;
  isHighlighted: boolean;
}) => {
  const operator = getFilterOperator(condition);
  const value = getFilterValue(condition);
  const field = condition.field;
  const operatorText =
    operatorToHumanReadableNameMap[operator as keyof typeof operatorToHumanReadableNameMap];

  return (
    <>
      <BadgeItem text={field} isHighlighted={isHighlighted} />
      <OperatorText operator={operatorText} subdued isHighlighted={isHighlighted} />
      <BadgeItem text={value?.toString() ?? ''} isHighlighted={isHighlighted} />
    </>
  );
};

const BadgeItem = ({ text, isHighlighted = false }: { text: string; isHighlighted?: boolean }) => (
  <EuiFlexItem grow={false}>
    <EuiBadge color={isHighlighted ? 'primary' : 'hollow'}>{text}</EuiBadge>
  </EuiFlexItem>
);

const RecursiveConditionDisplay = ({
  condition,
  needsParentheses = false,
  isHighlighted = false,
}: {
  condition: Condition;
  needsParentheses?: boolean;
  isHighlighted?: boolean;
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
            {index > 0 && <OperatorText operator={operator} bold isHighlighted={isHighlighted} />}
            <RecursiveConditionDisplay
              condition={subCondition}
              needsParentheses={needsParens}
              isHighlighted={isHighlighted}
            />
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
          <OperatorText operator="NOT" bold isHighlighted={isHighlighted} />
          <RecursiveConditionDisplay
            condition={condition.not}
            needsParentheses={isAndCondition(condition.not) || isOrCondition(condition.not)}
            isHighlighted={isHighlighted}
          />
        </>
      );
    }

    if (isAlwaysCondition(condition)) {
      return <BadgeItem text="always" isHighlighted={isHighlighted} />;
    }

    if (isNeverCondition(condition)) {
      return <BadgeItem text="never" isHighlighted={isHighlighted} />;
    }

    if (isFilterConditionObject(condition)) {
      return <FilterBadges condition={condition} isHighlighted={isHighlighted} />;
    }

    // Fallback for any unknown condition types
    return <BadgeItem text={JSON.stringify(condition)} isHighlighted={isHighlighted} />;
  };

  return (
    <>
      {needsParentheses && <OperatorText operator="(" isHighlighted={isHighlighted} />}
      {content()}
      {needsParentheses && <OperatorText operator=")" isHighlighted={isHighlighted} />}
    </>
  );
};

const OperatorText = ({
  operator,
  bold,
  subdued,
  isHighlighted = false,
}: {
  operator: string;
  bold?: boolean;
  subdued?: boolean;
  isHighlighted?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexItem grow={false}>
      <EuiText
        size="s"
        color={subdued ? 'subdued' : 'default'}
        style={{
          fontWeight: bold ? euiTheme.font.weight.bold : euiTheme.font.weight.regular,
          color: isHighlighted ? euiTheme.colors.primary : undefined,
        }}
      >
        {operator}
      </EuiText>
    </EuiFlexItem>
  );
};
