/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Condition,
  FilterCondition,
  isFilterCondition,
  isAndCondition,
  isOrCondition,
  isAlwaysCondition,
} from '../conditions';

function formatValue(value: string | number | boolean): string {
  if (typeof value === 'string') {
    const escaped = value.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return String(value);
}

function clauseToESQL(cond: FilterCondition): string {
  const f = cond.field;
  switch (cond.operator) {
    case 'neq': {
      const v = formatValue((cond as any).value);
      return `${f} != ${v}`;
    }
    case 'eq': {
      const v = formatValue((cond as any).value);
      return `${f} == ${v}`;
    }
    case 'exists':
      return `(${f} IS NOT NULL)`;
    case 'notExists':
      return `(${f} IS NULL)`;
    case 'gt': {
      const v = formatValue((cond as any).value);
      return `${f} > ${v}`;
    }
    case 'gte': {
      const v = formatValue((cond as any).value);
      return `${f} >= ${v}`;
    }
    case 'lt': {
      const v = formatValue((cond as any).value);
      return `${f} < ${v}`;
    }
    case 'lte': {
      const v = formatValue((cond as any).value);
      return `${f} <= ${v}`;
    }
    case 'contains':
      return `MATCH(${f}, "${(cond as any).value}")`;
    case 'startsWith':
      return `${f} LIKE "${(cond as any).value}*"`;
    case 'endsWith':
      return `${f} LIKE "*${(cond as any).value}"`;
    default:
      return 'FALSE';
  }
}

export function conditionToESQL(condition: Condition): string {
  if (isFilterCondition(condition)) {
    return clauseToESQL(condition);
  }
  if (isAndCondition(condition)) {
    const parts = condition.and.map(conditionToESQL);
    return `(${parts.join(' AND ')})`;
  }
  if (isOrCondition(condition)) {
    const parts = condition.or.map(conditionToESQL);
    return `(${parts.join(' OR ')})`;
  }
  if (isAlwaysCondition(condition)) {
    return 'TRUE';
  }
  return 'FALSE';
}
