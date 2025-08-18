/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlwaysCondition, Condition, ShorthandBinaryFilterCondition } from '@kbn/streamlang';
import { ALWAYS_CONDITION, isAlwaysCondition } from '@kbn/streamlang';

import { cloneDeep, isEqual } from 'lodash';

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
