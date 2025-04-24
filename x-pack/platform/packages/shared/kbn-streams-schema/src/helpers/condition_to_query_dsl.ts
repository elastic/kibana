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
import { normalizeForLucene } from './parse_path';

function conditionToClause(condition: FilterCondition) {
  const field = normalizeForLucene(condition.field);
  switch (condition.operator) {
    case 'neq':
      return { bool: { must_not: { match: { [field]: condition.value } } } };
    case 'eq':
      return { match: { [field]: condition.value } };
    case 'exists':
      return { exists: { field } };
    case 'gt':
      return { range: { [field]: { gt: condition.value } } };
    case 'gte':
      return { range: { [field]: { gte: condition.value } } };
    case 'lt':
      return { range: { [field]: { lt: condition.value } } };
    case 'lte':
      return { range: { [field]: { lte: condition.value } } };
    case 'contains':
      return { wildcard: { [field]: `*${condition.value}*` } };
    case 'startsWith':
      return { prefix: { [field]: condition.value } };
    case 'endsWith':
      return { wildcard: { [field]: `*${condition.value}` } };
    case 'notExists':
      return { bool: { must_not: { exists: { field } } } };
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
