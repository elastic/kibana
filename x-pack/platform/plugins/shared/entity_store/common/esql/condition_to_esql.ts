/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAndCondition,
  isFilterCondition,
  isNotCondition,
  isOrCondition,
  isAlwaysCondition,
  isNeverCondition,
  type Condition,
  type FilterCondition,
} from '@kbn/streamlang';
import { castField } from './cast';
import { escapeEsqlStringLiteral, esqlIsNotNullOrEmpty } from './strings';

/**
 * Drop-in wrapper around the streamlang `conditionToESQL` that optimizes two patterns:
 *
 * 1. Homogeneous OR-of-EQ chains into a single `castField(field) IN (…)`.
 *    The 18-name `fieldNotOneOfCondition` used by the user entity definition is the
 *    canonical example — eliminating 18 per-row scalar guards in the ES|QL planner.
 *
 * 2. `isNotEmpty` AND pattern `{and: [{field: X, exists: true}, {field: X, neq: ''}]}`
 *    into `castField(X) IS NOT NULL AND castField(X) != ""`, which the planner can push
 *    down more efficiently.
 *
 * All other condition shapes are rendered by our own leaf emitter so every field reference
 * is wrapped with the appropriate cast from the singleton field type registry — this prevents
 * ES|QL errors caused by ambiguous mappings across source indices.
 */
export function entityStoreConditionToESQL(condition: Condition): string {
  if (isAlwaysCondition(condition)) {
    return 'TRUE';
  }
  if (isNeverCondition(condition)) {
    return 'FALSE';
  }
  if (isOrCondition(condition)) {
    const inClause = buildInClauseOrNull(condition.or);
    if (inClause !== null) {
      return inClause;
    }
    return condition.or.map((c) => entityStoreConditionToESQL(c)).join(' OR ');
  }
  if (isNotCondition(condition)) {
    return `NOT (${entityStoreConditionToESQL(condition.not)})`;
  }
  if (isAndCondition(condition)) {
    const notEmptyField = getNotEmptyField(condition);
    if (notEmptyField !== null) {
      return esqlIsNotNullOrEmpty(notEmptyField);
    }
    return condition.and
      .map((c) => {
        const s = entityStoreConditionToESQL(c);
        // OR (non-IN) inside AND needs parens: AND binds tighter than OR in ES|QL
        if (isOrCondition(c) && buildInClauseOrNull(c.or) === null) {
          return `(${s})`;
        }
        return s;
      })
      .join(' AND ');
  }
  if (isFilterCondition(condition)) {
    return renderLeafCondition(condition as FilterCondition);
  }
  throw new Error(
    `[entityStoreConditionToESQL] Unrecognised condition shape: ${JSON.stringify(condition)}`
  );
}

/** Detects `{and: [{field: X, exists: true}, {field: X, neq: ''}]}` → returns X, or null. */
function getNotEmptyField(condition: Condition): string | null {
  if (!isAndCondition(condition) || condition.and.length !== 2) {
    return null;
  }
  const [first, second] = condition.and;
  if (!isFilterCondition(first) || !isFilterCondition(second)) {
    return null;
  }
  const f = first as unknown as Record<string, unknown>;
  const s = second as unknown as Record<string, unknown>;
  if (f.exists !== true || s.neq !== '' || f.field !== s.field) {
    return null;
  }
  return f.field as string;
}

/**
 * Returns null when IN optimization is not possible
 */
function buildInClauseOrNull(conditions: Condition[]): string | null {
  if (conditions.length < 2) {
    // only 1 condition, let it fall through to the leaf emitter
    return null;
  }
  if (!conditions.every((c) => isFilterCondition(c) && 'eq' in c)) {
    // not a homogeneous OR-of-EQ pattern
    return null;
  }

  const typed = conditions as Array<{ field: string; eq: unknown }>;
  const fieldSet = new Set(typed.map((c) => c.field));
  if (fieldSet.size !== 1) {
    // multiple fields — not homogeneous
    return null;
  }

  const values = typed.map((c) => c.eq);
  if (!values.every((v) => typeof v === 'string')) {
    // non-string values — don't use IN
    return null;
  }

  const [field] = fieldSet;
  const inList = (values as string[]).map((v) => `"${escapeEsqlStringLiteral(v)}"`).join(', ');
  return `${castField(field)} IN (${inList})`;
}

function valueToEsql(v: string | number | boolean): string {
  if (typeof v === 'string') {
    return `"${escapeEsqlStringLiteral(v)}"`;
  }
  if (typeof v === 'boolean') {
    return v ? 'TRUE' : 'FALSE';
  }
  return String(v);
}

function renderLeafCondition(condition: FilterCondition): string {
  const { field } = condition;
  const casted = castField(field);

  if ('exists' in condition && condition.exists !== undefined) {
    return condition.exists ? `${casted} IS NOT NULL` : `${casted} IS NULL`;
  }

  if ('eq' in condition && condition.eq !== undefined) {
    return `${casted} == ${valueToEsql(condition.eq)}`;
  }

  if ('neq' in condition && condition.neq !== undefined) {
    return `${casted} != ${valueToEsql(condition.neq)}`;
  }

  if ('gt' in condition && condition.gt !== undefined) {
    return `${casted} > ${valueToEsql(condition.gt)}`;
  }

  if ('gte' in condition && condition.gte !== undefined) {
    return `${casted} >= ${valueToEsql(condition.gte)}`;
  }

  if ('lt' in condition && condition.lt !== undefined) {
    return `${casted} < ${valueToEsql(condition.lt)}`;
  }

  if ('lte' in condition && condition.lte !== undefined) {
    return `${casted} <= ${valueToEsql(condition.lte)}`;
  }

  if ('range' in condition && condition.range !== undefined) {
    const parts: string[] = [];
    const { range } = condition;
    if (range.gt !== undefined) parts.push(`${casted} > ${valueToEsql(range.gt)}`);
    if (range.gte !== undefined) parts.push(`${casted} >= ${valueToEsql(range.gte)}`);
    if (range.lt !== undefined) parts.push(`${casted} < ${valueToEsql(range.lt)}`);
    if (range.lte !== undefined) parts.push(`${casted} <= ${valueToEsql(range.lte)}`);
    return parts.join(' AND ');
  }

  if ('includes' in condition && condition.includes !== undefined) {
    return `MV_CONTAINS(${casted}, ${valueToEsql(condition.includes)})`;
  }

  if ('startsWith' in condition && condition.startsWith !== undefined) {
    return `STARTS_WITH(${casted}, ${valueToEsql(condition.startsWith)})`;
  }

  if ('endsWith' in condition && condition.endsWith !== undefined) {
    return `ENDS_WITH(${casted}, ${valueToEsql(condition.endsWith)})`;
  }

  if ('contains' in condition && condition.contains !== undefined) {
    return `CONTAINS(TO_LOWER(${casted}), "${escapeEsqlStringLiteral(
      String(condition.contains).toLowerCase()
    )}")`;
  }

  throw new Error(
    `[entityStoreConditionToESQL] Unrecognised leaf condition shape: ${JSON.stringify(condition)}`
  );
}
