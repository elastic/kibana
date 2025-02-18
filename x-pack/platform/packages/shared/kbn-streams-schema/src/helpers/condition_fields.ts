/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Condition,
  isFilterCondition,
  isAndCondition,
  isOrCondition,
  FilterCondition,
} from '../models';

export function getFields(
  condition: Condition
): Array<{ name: string; type: 'number' | 'string' }> {
  const fields = collectFields(condition);
  // deduplicate fields, if mapped as string and number, keep as number
  const uniqueFields = new Map<string, 'number' | 'string'>();
  fields.forEach((field) => {
    const existing = uniqueFields.get(field.name);
    if (existing === 'number') {
      return;
    }
    if (existing === 'string' && field.type === 'number') {
      uniqueFields.set(field.name, 'number');
      return;
    }
    uniqueFields.set(field.name, field.type);
  });

  return Array.from(uniqueFields).map(([name, type]) => ({ name, type }));
}

function collectFields(condition: Condition): Array<{ name: string; type: 'number' | 'string' }> {
  if (isFilterCondition(condition)) {
    return [{ name: condition.field, type: getFieldTypeForFilterCondition(condition) }];
  }
  if (isAndCondition(condition)) {
    return condition.and.flatMap(collectFields);
  }
  if (isOrCondition(condition)) {
    return condition.or.flatMap(collectFields);
  }
  return [];
}

function getFieldTypeForFilterCondition(condition: FilterCondition): 'number' | 'string' {
  switch (condition.operator) {
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return 'number';
    case 'neq':
    case 'eq':
    case 'exists':
    case 'contains':
    case 'startsWith':
    case 'endsWith':
    case 'notExists':
      return 'string';
    default:
      return 'string';
  }
}
