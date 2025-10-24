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
import { isFilterCondition } from '../../../types/conditions';

function isColumn(item: ESQLAstItem): item is ESQLColumn {
  return (item as unknown as { type?: string }).type === 'column';
}

function isLiteral(item: ESQLAstItem): item is ESQLLiteral {
  return (item as unknown as { type?: string }).type === 'literal';
}

function isFunc(item: ESQLAstItem, name?: string): item is ESQLFunction {
  const isFunction = (item as unknown as { type?: string }).type === 'function';
  if (!isFunction) return false;
  if (!name) return true;
  return String((item as unknown as { name?: string }).name || '').toLowerCase() === name.toLowerCase();
}

function literalToJs(lit: ESQLLiteral): unknown {
  const l = lit as unknown as { valueUnquoted?: unknown; value?: unknown; text?: string };
  if (typeof l.valueUnquoted === 'string') return l.valueUnquoted;
  if (l.value !== undefined) {
    const v = l.value;
    if (typeof v === 'string') {
      const s = String(v);
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
      }
      return s;
    }
    return v;
  }
  const t = String(l.text ?? '').trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  if (/^(true|false)$/i.test(t)) return t.toLowerCase() === 'true';
  const num = Number(t);
  if (!Number.isNaN(num)) return num;
  return t;
}

function makeBinary(field: string, op: string, value: unknown): FilterCondition | undefined {
  switch (op) {
    case '==':
      return { field, eq: value } as any;
    case '!=':
      return { field, neq: value } as any;
    case '>':
      return { field, gt: value } as any;
    case '>=':
      return { field, gte: value } as any;
    case '<':
      return { field, lt: value } as any;
    case '<=':
      return { field, lte: value } as any;
    default:
      return undefined;
  }
}

function likeToFilter(field: string, pattern: string): FilterCondition | undefined {
  // Map anchored LIKE patterns to Streamlang text operators
  const hasPercent = pattern.includes('%');
  const hasUnderscore = pattern.includes('_');
  if (hasUnderscore) return undefined; // not supported safely
  if (!hasPercent) return { field, eq: pattern };
  const startsWithPercent = pattern.startsWith('%');
  const endsWithPercent = pattern.endsWith('%');
  const core = pattern.replace(/^%|%$/g, '');
  if (startsWithPercent && endsWithPercent) return { field, contains: core } as any;
  if (endsWithPercent) return { field, startsWith: core } as any;
  if (startsWithPercent) return { field, endsWith: core } as any;
  return undefined;
}

function tryBinary(expr: ESQLFunction): Condition | undefined {
  const name = String(expr.name || '').toLowerCase();
  if (
    (name === 'and' || name === 'or' || name === '==' || name === '!=' || name === '>' ||
      name === '>=' || name === '<' || name === '<=') &&
    Array.isArray((expr as any).args)
  ) {
    const [a, b] = (expr as any).args as ESQLAstItem[];
    if (name === 'and' || name === 'or') {
      const left = esqlAstExpressionToCondition(a as ESQLSingleAstItem);
      const right = esqlAstExpressionToCondition(b as ESQLSingleAstItem);
      if (!left || !right) return undefined;
      return name === 'and' ? { and: [left, right] } : { or: [left, right] };
    }
    // Binary comparisons
    if (isColumn(a) && isLiteral(b)) return makeBinary(a.text, expr.name, literalToJs(b) as any);
    if (isLiteral(a) && isColumn(b)) return makeBinary(b.text, expr.name, literalToJs(a) as any);
  }
  return undefined;
}

export function esqlAstExpressionToCondition(expr: ESQLSingleAstItem): Condition | undefined {
  // LIKE(column, literal)
  if (isFunc(expr, 'like')) {
    const args = (expr as unknown as { args?: ESQLAstItem[] }).args as ESQLAstItem[];
    const col = args && isColumn(args[0]) ? (args[0] as ESQLColumn) : undefined;
    const lit = args && isLiteral(args[1]) ? (args[1] as ESQLLiteral) : undefined;
    if (col && lit) return likeToFilter(col.text, String(literalToJs(lit)));
    return undefined;
  }

  // NOT IN(column, [literals...]) -> AND of inequality
  if (isFunc(expr)) {
    const name = String((expr as unknown as { name?: string }).name || '').toUpperCase();
    if (name === 'NOT IN') {
      const args = (expr as unknown as { args?: ESQLAstItem[] }).args as ESQLAstItem[];
      const col = args && isColumn(args[0]) ? (args[0] as ESQLColumn) : undefined;
      if (!col) return undefined;
      const rhsNode = (args.length > 1 ? (args[1] as unknown as { type?: string; values?: ESQLAstItem[] }) : undefined);
      let rhsItems: ESQLAstItem[] = [];
      if (rhsNode && rhsNode.type === 'list' && Array.isArray(rhsNode.values)) {
        rhsItems = rhsNode.values as ESQLAstItem[];
      } else {
        rhsItems = (args.slice(1) as any[]).flatMap((a) => (Array.isArray(a) ? a : [a])) as ESQLAstItem[];
      }
      const values = rhsItems
        .filter(isLiteral)
        .map((l) => literalToJs(l as ESQLLiteral))
        .filter((v): v is StringOrNumberOrBoolean =>
          typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
        );
      if (values.length === 0) return undefined;
      if (values.length === 1) return { field: col.text, neq: values[0] };
      return { and: values.map((v) => ({ field: col.text, neq: v })) };
    }
  }

  // BETWEEN is not supported in ES|QL; no handler

  // IN(column, [literals...]) -> OR of equality
  if (isFunc(expr, 'in')) {
    const args = (expr as unknown as { args?: ESQLAstItem[] }).args as ESQLAstItem[];
    const col = args && isColumn(args[0]) ? (args[0] as ESQLColumn) : undefined;
    if (!col) return undefined;
    // Prefer tuple-style lists: the AST provides a node with type 'list' and a 'values' array
    const rhsNode = (args.length > 1 ? (args[1] as unknown as { type?: string; values?: ESQLAstItem[] }) : undefined);
    let rhsItems: ESQLAstItem[] = [];
    if (rhsNode && rhsNode.type === 'list' && Array.isArray(rhsNode.values)) {
      rhsItems = rhsNode.values as ESQLAstItem[];
    } else {
      // Fallback: deep-flatten remaining args in case of different shapes
      rhsItems = (args.slice(1) as any[]).flatMap((a) => (Array.isArray(a) ? a : [a])) as ESQLAstItem[];
    }
    const values = rhsItems
      .filter(isLiteral)
      .map((l) => literalToJs(l as ESQLLiteral))
      .filter((v): v is StringOrNumberOrBoolean =>
        typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
      );
    if (values.length === 0) return undefined;
    if (values.length === 1) return { field: col.text, eq: values[0] };
    return { or: values.map((v) => ({ field: col.text, eq: v })) };
  }

  // NOT(...) -> negate condition
  if (isFunc(expr, 'not')) {
    const args = (expr as unknown as { args?: ESQLAstItem[] }).args as ESQLAstItem[];
    const inner = args && (args[0] as ESQLSingleAstItem);
    const c = inner ? esqlAstExpressionToCondition(inner) : undefined;
    // Normalize NOT(IS NULL col) -> { field, exists: true }
    if (c && isFilterCondition(c) && 'field' in c) {
      const cf = c as FilterCondition;
      if ('exists' in cf) {
        return { field: (cf as { field: string }).field, exists: !(cf as { exists?: boolean }).exists };
      }
    }
    return c ? { not: c } : undefined;
  }

  // IS NULL postfix and NOT(IS NULL)
  if (isFunc(expr)) {
    const name = String((expr as unknown as { name?: string }).name || '').toUpperCase();
    if (name === 'IS NULL') {
      const col = (expr as unknown as { args?: ESQLAstItem[] }).args?.[0];
      if (col && isColumn(col)) return { field: (col as ESQLColumn).text, exists: false };
    }
    if (name === 'IS NOT NULL') {
      const col = (expr as unknown as { args?: ESQLAstItem[] }).args?.[0];
      if (col && isColumn(col)) return { field: (col as ESQLColumn).text, exists: true };
    }
  }

  const binary = isFunc(expr) ? tryBinary(expr) : undefined;
  if (binary) return binary;

  return undefined;
}


