/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FilterCondition,
  isAlwaysCondition,
  Condition,
  isFilterCondition,
  isAndCondition,
  isOrCondition,
} from '../models';
import { getRealFieldName } from './namespaced_ecs';

function conditionToClause(condition: FilterCondition) {
  const realFieldName = getRealFieldName(condition.field);
  switch (condition.operator) {
    case 'neq':
      return { bool: { must_not: { match: { [realFieldName]: condition.value } } } };
    case 'eq':
      return { match: { [realFieldName]: condition.value } };
    case 'exists':
      return { exists: { field: realFieldName } };
    case 'gt':
      return { range: { [realFieldName]: { gt: condition.value } } };
    case 'gte':
      return { range: { [realFieldName]: { gte: condition.value } } };
    case 'lt':
      return { range: { [realFieldName]: { lt: condition.value } } };
    case 'lte':
      return { range: { [realFieldName]: { lte: condition.value } } };
    case 'contains':
      return { wildcard: { [realFieldName]: `*${condition.value}*` } };
    case 'startsWith':
      return { prefix: { [realFieldName]: condition.value } };
    case 'endsWith':
      return { wildcard: { [realFieldName]: `*${condition.value}` } };
    case 'notExists':
      return { bool: { must_not: { exists: { field: realFieldName } } } };
    default:
      return { match_none: {} };
  }
}

export function conditionToQueryDsl(condition: Condition): any {
  if (isFilterCondition(condition)) {
    return conditionToClause(condition);
  }
  if (isAndCondition(condition)) {
    const and = condition.and.map((filter) => conditionToQueryDsl(filter));
    return {
      bool: {
        must: and,
      },
    };
  }
  if (isOrCondition(condition)) {
    const or = condition.or.map((filter) => conditionToQueryDsl(filter));
    return {
      bool: {
        should: or,
      },
    };
  }
  if (isAlwaysCondition(condition)) {
    return { match_all: {} };
  }
  return {
    match_none: {},
  };
}
