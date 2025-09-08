/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, type ESQLAstItem } from '@kbn/esql-ast';
import {
  type Condition,
  isAlwaysCondition,
  isAndCondition,
  isFilterCondition,
  isNotCondition,
  isOrCondition,
} from '../../../types/conditions';

export function literalFromAny(value: any): ESQLAstItem {
  if (Array.isArray(value)) {
    // Let the Builder handle nested structures properly
    return Builder.expression.list.literal({
      values: value.map((item) => literalFromAny(item)) as any,
    });
  }

  if (typeof value === 'string') {
    return Builder.expression.literal.string(value);
  }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? Builder.expression.literal.integer(value)
      : Builder.expression.literal.decimal(value);
  }
  if (typeof value === 'boolean') {
    return Builder.expression.literal.boolean(value);
  }
  if (value === null || value === undefined) {
    return Builder.expression.literal.nil();
  }
  // Fallback to string representation for complex objects
  return Builder.expression.literal.string(JSON.stringify(value));
}

export function conditionToESQL(condition: Condition, isNested = false): ESQLAstItem {
  if (isFilterCondition(condition)) {
    const field = Builder.expression.column(condition.field);

    if ('eq' in condition) {
      return Builder.expression.func.binary('==', [field, literalFromAny(condition.eq)]);
    }
    if ('neq' in condition) {
      return Builder.expression.func.binary('!=', [field, literalFromAny(condition.neq)]);
    }
    if ('gt' in condition) {
      return Builder.expression.func.binary('>', [field, literalFromAny(condition.gt)]);
    }
    if ('gte' in condition) {
      return Builder.expression.func.binary('>=', [field, literalFromAny(condition.gte)]);
    }
    if ('lt' in condition) {
      return Builder.expression.func.binary('<', [field, literalFromAny(condition.lt)]);
    }
    if ('lte' in condition) {
      return Builder.expression.func.binary('<=', [field, literalFromAny(condition.lte)]);
    }
    if ('exists' in condition) {
      if (condition.exists === true) {
        return Builder.expression.func.call('NOT', [
          Builder.expression.func.postfix('IS NULL', field),
        ]);
      } else {
        return Builder.expression.func.postfix('IS NULL', field);
      }
    }
    if ('range' in condition && condition.range) {
      const parts: ESQLAstItem[] = [];
      if (condition.range.gt !== undefined)
        parts.push(
          Builder.expression.func.binary('>', [field, literalFromAny(condition.range.gt)])
        );
      if (condition.range.gte !== undefined)
        parts.push(
          Builder.expression.func.binary('>=', [field, literalFromAny(condition.range.gte)])
        );
      if (condition.range.lt !== undefined)
        parts.push(
          Builder.expression.func.binary('<', [field, literalFromAny(condition.range.lt)])
        );
      if (condition.range.lte !== undefined)
        parts.push(
          Builder.expression.func.binary('<=', [field, literalFromAny(condition.range.lte)])
        );

      if (parts.length === 1) return parts[0];
      return parts.reduce((acc, part) => Builder.expression.func.binary('and', [acc, part]));
    }
    if ('contains' in condition) {
      return Builder.expression.func.call('LIKE', [
        field,
        Builder.expression.literal.string(`%${condition.contains}%`),
      ]);
    }
    if ('startsWith' in condition) {
      return Builder.expression.func.call('LIKE', [
        field,
        Builder.expression.literal.string(`${condition.startsWith}%`),
      ]);
    }
    if ('endsWith' in condition) {
      return Builder.expression.func.call('LIKE', [
        field,
        Builder.expression.literal.string(`%${condition.endsWith}`),
      ]);
    }
  } else if (isAndCondition(condition)) {
    const andConditions = condition.and.map((c) => conditionToESQL(c, true));
    return andConditions.reduce((acc, cond) => Builder.expression.func.binary('and', [acc, cond]));
  } else if (isOrCondition(condition)) {
    const orConditions = condition.or.map((c) => conditionToESQL(c, true));
    return orConditions.reduce((acc, cond) => Builder.expression.func.binary('or', [acc, cond]));
  } else if (isNotCondition(condition)) {
    const notCondition = conditionToESQL(condition.not, true);
    return Builder.expression.func.unary('NOT', notCondition);
  } else if (isAlwaysCondition(condition)) {
    return Builder.expression.literal.boolean(true);
  }

  return Builder.expression.literal.boolean(false);
}
