/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder, type ESQLAstItem, type ESQLSingleAstItem } from '@kbn/esql-language';
import {
  type Condition,
  isAlwaysCondition,
  isAndCondition,
  isFilterCondition,
  isNotCondition,
  isOrCondition,
} from '../../../types/conditions';

export function esqlLiteralFromAny(value: any): ESQLAstItem {
  if (Array.isArray(value)) {
    // Let the Builder handle nested structures properly
    return Builder.expression.list.literal({
      values: value.map((item) => esqlLiteralFromAny(item)) as any,
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

export function conditionToESQLAst(condition: Condition): ESQLSingleAstItem {
  if (isFilterCondition(condition)) {
    const field = Builder.expression.column(condition.field);

    if ('eq' in condition) {
      return Builder.expression.func.binary('==', [field, esqlLiteralFromAny(condition.eq)]);
    }
    if ('neq' in condition) {
      return Builder.expression.func.binary('!=', [field, esqlLiteralFromAny(condition.neq)]);
    }
    if ('gt' in condition) {
      return Builder.expression.func.binary('>', [field, esqlLiteralFromAny(condition.gt)]);
    }
    if ('gte' in condition) {
      return Builder.expression.func.binary('>=', [field, esqlLiteralFromAny(condition.gte)]);
    }
    if ('lt' in condition) {
      return Builder.expression.func.binary('<', [field, esqlLiteralFromAny(condition.lt)]);
    }
    if ('lte' in condition) {
      return Builder.expression.func.binary('<=', [field, esqlLiteralFromAny(condition.lte)]);
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
      const parts: ESQLSingleAstItem[] = [];
      if (condition.range.gt !== undefined)
        parts.push(
          Builder.expression.func.binary('>', [field, esqlLiteralFromAny(condition.range.gt)])
        );
      if (condition.range.gte !== undefined)
        parts.push(
          Builder.expression.func.binary('>=', [field, esqlLiteralFromAny(condition.range.gte)])
        );
      if (condition.range.lt !== undefined)
        parts.push(
          Builder.expression.func.binary('<', [field, esqlLiteralFromAny(condition.range.lt)])
        );
      if (condition.range.lte !== undefined)
        parts.push(
          Builder.expression.func.binary('<=', [field, esqlLiteralFromAny(condition.range.lte)])
        );

      if (parts.length === 1) return parts[0];
      return parts.reduce((acc, part) => Builder.expression.func.binary('and', [acc, part]));
    }
    if ('contains' in condition) {
      // Make contains case-insensitive by lowercasing both field and value
      const lowerField = Builder.expression.func.call('TO_LOWER', [field]);
      const lowerValue = String(condition.contains).toLowerCase();
      return Builder.expression.func.call('CONTAINS', [
        lowerField,
        Builder.expression.literal.string(lowerValue),
      ]);
    }
    if ('startsWith' in condition) {
      return Builder.expression.func.call('STARTS_WITH', [
        field,
        Builder.expression.literal.string(String(condition.startsWith)),
      ]);
    }
    if ('endsWith' in condition) {
      return Builder.expression.func.call('ENDS_WITH', [
        field,
        Builder.expression.literal.string(String(condition.endsWith)),
      ]);
    }
    if ('includes' in condition) {
      return Builder.expression.func.call('MV_CONTAINS', [
        field,
        esqlLiteralFromAny(condition.includes),
      ]);
    }
  } else if (isAndCondition(condition)) {
    const andConditions = condition.and.map((c) => conditionToESQLAst(c));
    return andConditions.reduce((acc, cond) => Builder.expression.func.binary('and', [acc, cond]));
  } else if (isOrCondition(condition)) {
    const orConditions = condition.or.map((c) => conditionToESQLAst(c));
    return orConditions.reduce((acc, cond) => Builder.expression.func.binary('or', [acc, cond]));
  } else if (isNotCondition(condition)) {
    const notCondition = conditionToESQLAst(condition.not);
    return Builder.expression.func.unary('NOT', notCondition);
  } else if (isAlwaysCondition(condition)) {
    return Builder.expression.literal.boolean(true);
  }

  return Builder.expression.literal.boolean(false);
}
