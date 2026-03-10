/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiSelect, type EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getDefaultFormValueForOperator,
  getFilterOperator,
  getFilterValue,
  type FilterCondition,
  type OperatorKeys,
  operatorToHumanReadableNameMap,
} from '@kbn/streamlang';

// UI-only shorthand operator keys for boolean literal comparisons ("equals true" etc.)
export const BooleanShorthandOperatorKeys = {
  EQ_TRUE: 'sh_eq_true',
  EQ_FALSE: 'sh_eq_false',
  NEQ_TRUE: 'sh_neq_true',
  NEQ_FALSE: 'sh_neq_false',
} as const;

const streamlangOperators = Object.entries(operatorToHumanReadableNameMap).map(([value, text]) => ({
  value,
  text,
}));
const streamlangEqualityOperators = streamlangOperators.filter(
  (op) => op.value === 'eq' || op.value === 'neq'
);
const streamlangNonEqualityOperators = streamlangOperators.filter(
  (op) => op.value !== 'eq' && op.value !== 'neq'
);

export const operatorOptions: EuiSelectOption[] = [
  ...streamlangEqualityOperators,
  // UI-only shorthand operators for boolean literals, not part of streamlang
  {
    value: BooleanShorthandOperatorKeys.EQ_TRUE,
    text: i18n.translate('xpack.streams.filter.equalsTrue', {
      defaultMessage: 'equals true',
    }),
  },
  {
    value: BooleanShorthandOperatorKeys.EQ_FALSE,
    text: i18n.translate('xpack.streams.filter.equalsFalse', {
      defaultMessage: 'equals false',
    }),
  },
  {
    value: BooleanShorthandOperatorKeys.NEQ_TRUE,
    text: i18n.translate('xpack.streams.filter.notEqualsTrue', {
      defaultMessage: 'not equals true',
    }),
  },
  {
    value: BooleanShorthandOperatorKeys.NEQ_FALSE,
    text: i18n.translate('xpack.streams.filter.notEqualsFalse', {
      defaultMessage: 'not equals false',
    }),
  },
  ...streamlangNonEqualityOperators,
];

export interface OperatorSelectorProps {
  condition: FilterCondition;
  onConditionChange: (condition: FilterCondition) => void;
  disabled?: boolean;
  compressed?: boolean;
  dataTestSubj?: string;
}

/**
 * Operator selector responsible for rendering the operator dropdown, including
 * UI-only shorthand options for boolean literals, and applying the appropriate
 * updates to the provided condition.
 */
export const OperatorSelector: React.FC<OperatorSelectorProps> = ({
  condition,
  onConditionChange,
  disabled = false,
  compressed = false,
  dataTestSubj = 'streamsAppConditionEditorOperator',
}) => {
  // Determine which operator should be displayed in the UI.
  const displayedOperator = useMemo(() => {
    // Check if a shorthand boolean operator can represent this condition
    return getBooleanShorthandOperatorForFilterCondition(condition) ?? getFilterOperator(condition);
  }, [condition]);

  const handleOperatorChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newOperator = event.target.value;

      // Check if the condition is represented by a boolean shorthand operator, convert to equivalent if so
      const booleanShorthandCondition = getFilterConditionForBooleanShorthand(
        newOperator,
        condition.field
      );
      if (booleanShorthandCondition) {
        onConditionChange(booleanShorthandCondition);
        return;
      }

      const existingValue = getFilterValue(condition);
      const defaultValue = getDefaultFormValueForOperator(newOperator as OperatorKeys);
      const typeChanged = typeof existingValue !== typeof defaultValue;

      onConditionChange({
        field: condition.field,
        [newOperator]: existingValue !== undefined && !typeChanged ? existingValue : defaultValue,
      } as FilterCondition);
    },
    [condition, onConditionChange]
  );

  return (
    <EuiSelect
      aria-label={i18n.translate('xpack.streams.filter.operator', {
        defaultMessage: 'Operator',
      })}
      data-test-subj={dataTestSubj}
      options={operatorOptions}
      value={displayedOperator}
      compressed={compressed}
      onChange={handleOperatorChange}
      disabled={disabled}
    />
  );
};

function getBooleanShorthandOperatorForFilterCondition(
  condition: FilterCondition
): string | undefined {
  const operator = getFilterOperator(condition);
  const value = getFilterValue(condition);

  if (operator === 'eq' && typeof value === 'boolean') {
    return value ? BooleanShorthandOperatorKeys.EQ_TRUE : BooleanShorthandOperatorKeys.EQ_FALSE;
  }
  if (operator === 'neq' && typeof value === 'boolean') {
    return value ? BooleanShorthandOperatorKeys.NEQ_TRUE : BooleanShorthandOperatorKeys.NEQ_FALSE;
  }
  return operator as string;
}

// Given a boolean shorthand operator and field, return the corresponding FilterCondition if applicable, or undefined
function getFilterConditionForBooleanShorthand(
  operator: string,
  field: FilterCondition['field']
): FilterCondition | undefined {
  switch (operator) {
    case BooleanShorthandOperatorKeys.EQ_TRUE:
      return { field, eq: true };
    case BooleanShorthandOperatorKeys.EQ_FALSE:
      return { field, eq: false };
    case BooleanShorthandOperatorKeys.NEQ_TRUE:
      return { field, neq: true };
    case BooleanShorthandOperatorKeys.NEQ_FALSE:
      return { field, neq: false };
  }

  return undefined;
}
