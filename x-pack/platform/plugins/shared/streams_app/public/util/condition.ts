/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlwaysCondition,
  Condition,
  FilterCondition,
  OperatorKeys,
  ShorthandBinaryFilterCondition,
} from '@kbn/streamlang';
import {
  ALWAYS_CONDITION,
  getFilterOperator,
  getFilterValue,
  isAlwaysCondition,
  isFilterConditionObject,
} from '@kbn/streamlang';

import { cloneDeep, isEqual, isPlainObject } from 'lodash';

export const EMPTY_EQUALS_CONDITION: ShorthandBinaryFilterCondition = Object.freeze({
  field: '',
  eq: '',
});

export function alwaysToEmptyEquals<T extends Condition>(condition: T): Exclude<T, AlwaysCondition>;

export function alwaysToEmptyEquals(condition: Condition) {
  if (isAlwaysCondition(condition)) {
    return cloneDeep(EMPTY_EQUALS_CONDITION);
  }
  return condition;
}

export function emptyEqualsToAlways(condition: Condition) {
  if (isEqual(condition, EMPTY_EQUALS_CONDITION)) {
    return ALWAYS_CONDITION;
  }
  return condition;
}

const UI_SUPPORTED_OPERATORS_AND_VALUE_TYPES: Record<Exclude<OperatorKeys, 'range'>, string[]> = {
  eq: ['string'],
  neq: ['string'],
  gt: ['string'],
  gte: ['string'],
  lt: ['string'],
  lte: ['string'],
  contains: ['string'],
  startsWith: ['string'],
  endsWith: ['string'],
  exists: ['boolean'],
};

function isOperatorUiSupported(
  operator: OperatorKeys
): operator is keyof typeof UI_SUPPORTED_OPERATORS_AND_VALUE_TYPES {
  return operator in UI_SUPPORTED_OPERATORS_AND_VALUE_TYPES;
}

export const isConditionRepresentableInUI = (
  condition: Condition
): condition is FilterCondition | AlwaysCondition => {
  if (isPlainObject(condition) && isFilterConditionObject(condition)) {
    const operator = getFilterOperator(condition as FilterCondition);
    const value = getFilterValue(condition as FilterCondition);

    // Check if the operator itself is supported by the UI
    if (!operator || !isOperatorUiSupported(operator)) {
      return false;
    }

    // Check if the value's data type is supported for that specific operator
    const allowedTypes = UI_SUPPORTED_OPERATORS_AND_VALUE_TYPES[operator];
    if (!allowedTypes) {
      return false;
    }

    return allowedTypes.includes(typeof value);
  }

  // If it's not a simple filter, the only other UI-representable state is
  // an 'always' condition, which is representable in UI (empty condition)
  return isAlwaysCondition(condition);
};
