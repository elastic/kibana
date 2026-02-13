/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterCondition, Condition, RangeCondition } from '../../types/conditions';
import {
  isFilterCondition,
  isAndCondition,
  isOrCondition,
  isAlwaysCondition,
  isNotCondition,
} from '../../types/conditions';
import { getFilterOperator, getFilterValue } from './helpers';

function conditionToClause(condition: FilterCondition) {
  const operator = getFilterOperator(condition);
  const value = getFilterValue(condition);

  switch (operator) {
    case 'neq':
      return { bool: { must_not: { match: { [condition.field]: value } } } };
    case 'eq':
      return { match: { [condition.field]: value } };
    case 'exists':
      if (value === true) {
        return { exists: { field: condition.field } };
      } else if (value === false) {
        return { bool: { must_not: { exists: { field: condition.field } } } };
      }
    case 'gt':
      return { range: { [condition.field]: { gt: value } } };
    case 'gte':
      return { range: { [condition.field]: { gte: value } } };
    case 'lt':
      return { range: { [condition.field]: { lt: value } } };
    case 'lte':
      return { range: { [condition.field]: { lte: value } } };
    case 'contains':
      return {
        wildcard: {
          [condition.field]: {
            value: `*${value}*`,
            case_insensitive: true,
          },
        },
      };
    case 'startsWith':
      return { prefix: { [condition.field]: `${value}*` } };
    case 'endsWith':
      return { wildcard: { [condition.field]: `*${value}` } };
    case 'range': {
      const rangeValue = value as RangeCondition;
      const rangeQuery: RangeCondition = {};

      if (rangeValue.gte !== undefined) {
        rangeQuery.gte = rangeValue.gte;
      }
      if (rangeValue.gt !== undefined) {
        rangeQuery.gt = rangeValue.gt;
      }
      if (rangeValue.lte !== undefined) {
        rangeQuery.lte = rangeValue.lte;
      }
      if (rangeValue.lt !== undefined) {
        rangeQuery.lt = rangeValue.lt;
      }

      return { range: { [condition.field]: rangeQuery } };
    }
    case 'includes':
      return { terms: { [condition.field]: [value] } };
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

  if (isNotCondition(condition)) {
    const not = conditionToQueryDsl(condition.not);
    return {
      bool: {
        must_not: not,
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
