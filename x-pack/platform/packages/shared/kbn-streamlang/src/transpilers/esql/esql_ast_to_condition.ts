/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V.
 * Licensed under the Elastic License 2.0.
 */

import type {
  ESQLAstItem,
  ESQLSingleAstItem,
  ESQLColumn,
  ESQLLiteral,
  ESQLFunction,
} from '@kbn/esql-ast/src/types';
import type { Condition, FilterCondition, StringOrNumberOrBoolean } from '../../../types/conditions';
import { literalToJs } from './literals';
import { isFilterCondition } from '../../../types/conditions';

function isColumn(item: ESQLAstItem): item is ESQLColumn {
  if (Array.isArray(item)) return false;
  return item.type === 'column';
}

function colName(col: ESQLColumn): string {
  return col.parts && col.parts.length ? col.parts.join('.') : col.text;
}

function isSingleAstItem(item: ESQLAstItem): item is ESQLSingleAstItem {
  return !Array.isArray(item);
}

function isLiteral(item: ESQLAstItem): item is ESQLLiteral {
  if (Array.isArray(item)) return false;
  return item.type === 'literal';
}


function isFunc(item: ESQLAstItem, name?: string): item is ESQLFunction {
  if (Array.isArray(item)) return false;
  if (item.type !== 'function') return false;
  if (!name) return true;
  return getFuncName(item as ESQLFunction).toLowerCase() === name.toLowerCase();
}

function getFuncName(f: ESQLFunction): string {
  return String(f.name || '');
}

function getArgs(f: ESQLFunction): ESQLAstItem[] {
  return f.args ?? [];
}


const flattenAstItems = (items: ESQLAstItem[]): ESQLAstItem[] =>
  items.flatMap((item) => {
    if (!item) return [];
    if (Array.isArray(item)) return flattenAstItems(item);
    return [item];
  });


function asComparable(value: unknown): StringOrNumberOrBoolean | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return undefined;
}

function makeBinary(
  field: string,
  op: string,
  value: StringOrNumberOrBoolean
): FilterCondition | undefined {
  switch (op) {
    case '==':
      return { field, eq: value };
    case '!=':
      return { field, neq: value };
    case '>':
      return { field, gt: value };
    case '>=':
      return { field, gte: value };
    case '<':
      return { field, lt: value };
    case '<=':
      return { field, lte: value };
    default:
      return undefined;
  }
}

function likeToFilter(field: string, pattern: string): FilterCondition | undefined {
  // Map anchored LIKE patterns to Streamlang text operators
  const hasPercent = pattern.includes('%');
  const hasUnderscore = pattern.includes('_');
  if (hasUnderscore) return undefined;
  if (!hasPercent) return { field, eq: pattern };
  const startsWithPercent = pattern.startsWith('%');
  const endsWithPercent = pattern.endsWith('%');
  const core = pattern.replace(/^%|%$/g, '');
  if (startsWithPercent && endsWithPercent) return { field, contains: core };
  if (endsWithPercent) return { field, startsWith: core };
  if (startsWithPercent) return { field, endsWith: core };
  return undefined;
}

function tryBinary(expr: ESQLFunction): Condition | undefined {
  const operator = getFuncName(expr).toLowerCase();

  const validOperators = new Set(['and', 'or', '==', '!=', '>', '>=', '<', '<=']);
  if (!validOperators.has(operator)) {
    return undefined;
  }

  const args = getArgs(expr);
  const first = args[0];
  const second = args[1];
  if (!first || !second) return undefined;

  if (operator === 'and' || operator === 'or') {
    if (!isSingleAstItem(first) || !isSingleAstItem(second)) return undefined;
    const left = esqlAstExpressionToCondition(first);
    const right = esqlAstExpressionToCondition(second);
    if (!left || !right) return undefined;
    return operator === 'and' ? { and: [left, right] } : { or: [left, right] };
  }

  if (isColumn(first) && isLiteral(second)) {
    const value = asComparable(literalToJs(second));
    return value !== undefined ? makeBinary(colName(first), operator, value) : undefined;
  }

  if (isLiteral(first) && isColumn(second)) {
    const value = asComparable(literalToJs(first));
    return value !== undefined ? makeBinary(colName(second), operator, value) : undefined;
  }

  return undefined;
}

export function esqlAstExpressionToCondition(expr: ESQLSingleAstItem): Condition | undefined {
  if (isFunc(expr, 'like')) {
    const args = getArgs(expr);
    const col = args && isColumn(args[0]) ? args[0] : undefined;
    const lit = args && isLiteral(args[1]) ? args[1] : undefined;
    if (col && lit) return likeToFilter(colName(col), String(literalToJs(lit)));
    return undefined;
  }

  // NOT IN(column, [literals...]) -> AND of inequality
  if (isFunc(expr)) {
    const name = getFuncName(expr).toUpperCase();
    if (name === 'NOT IN') {
      const args = getArgs(expr);
      const col = args && isColumn(args[0]) ? args[0] : undefined;
      if (!col) return undefined;
      const rhsNode = (args.length > 1 ? (args[1] as unknown as { type?: string; values?: ESQLAstItem[] }) : undefined);
      let rhsItems: ESQLAstItem[] = [];
      if (rhsNode && rhsNode.type === 'list' && Array.isArray(rhsNode.values)) {
        rhsItems = rhsNode.values;
      } else {
        rhsItems = (args.slice(1)).flatMap((a) => (Array.isArray(a) ? a : [a]));
      }
      const values = rhsItems
        .filter(isLiteral)
        .map((l) => literalToJs(l))
        .filter((v): v is StringOrNumberOrBoolean =>
          typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
        );
      if (values.length === 0) return undefined;
      if (values.length === 1) return { field: colName(col), neq: values[0] };
      return { and: values.map((v) => ({ field: colName(col), neq: v })) };
    }
  }

  // IN(column, [literals...]) -> OR of equality
  if (isFunc(expr, 'in')) {
    const args = getArgs(expr);
    const col = args && isColumn(args[0]) ? args[0] : undefined;
    if (!col) return undefined;
    const rhsNode = (args.length > 1 ? (args[1] as unknown as { type?: string; values?: ESQLAstItem[] }) : undefined);
    let rhsItems: ESQLAstItem[] = [];
    if (rhsNode && rhsNode.type === 'list' && Array.isArray(rhsNode.values)) {
      rhsItems = rhsNode.values;
    } else {
      rhsItems = (args.slice(1)).flatMap((a) => (Array.isArray(a) ? a : [a]));
    }
    const values = rhsItems
      .filter(isLiteral)
      .map((l) => literalToJs(l))
      .filter((v): v is StringOrNumberOrBoolean =>
        typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
      );
    if (values.length === 0) return undefined;
    if (values.length === 1) return { field: colName(col), eq: values[0] };
    return { or: values.map((v) => ({ field: colName(col), eq: v })) };
  }

  // NOT(...) -> negate condition
  if (isFunc(expr, 'not')) {
    const args = getArgs(expr);
    const inner = args && args[0];
    const c = inner ? esqlAstExpressionToCondition(inner as ESQLSingleAstItem) : undefined;
    // Normalize NOT(IS NULL col) -> { field, exists: true }
    if (c && isFilterCondition(c) && 'field' in c) {
      const cf = c;
      if ('exists' in cf) {
        return { field: cf.field, exists: !cf.exists };
      }
    }
    return c ? { not: c } : undefined;
  }

  // IS NULL postfix and NOT(IS NULL)
  if (isFunc(expr)) {
    const name = getFuncName(expr).toUpperCase();
    if (name === 'IS NULL') {
      const col = getArgs(expr)?.[0];
      if (col && isColumn(col)) return { field: colName(col), exists: false };
    }
    if (name === 'IS NOT NULL') {
      const col = getArgs(expr)?.[0];
      if (col && isColumn(col)) return { field: colName(col), exists: true };
    }
  }

  const binary = isFunc(expr) ? tryBinary(expr) : undefined;
  if (binary) return binary;

  return undefined;
}
