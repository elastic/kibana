/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeField, escapeStringLiteral } from './esql';
import { translateKqlToEsql } from './kql_to_esql';
import type { FormBasedColumn } from './types';

export interface FiltersBucket {
  caseExpr: string;
  matchWhere: string;
}

export const buildFiltersBucket = (column: FormBasedColumn): FiltersBucket | undefined => {
  const filters = (
    column.params as
      | { filters?: Array<{ input?: { query?: unknown }; label?: unknown }> }
      | undefined
  )?.filters;
  if (!Array.isArray(filters) || filters.length === 0) {
    return undefined;
  }
  const branches: string[] = [];
  const conditions: string[] = [];
  for (const [index, filter] of filters.entries()) {
    const query = typeof filter.input?.query === 'string' ? filter.input.query : '';
    const condition = translateKqlToEsql(query, escapeField);
    if (condition === undefined) {
      return undefined;
    }
    const label =
      typeof filter.label === 'string' && filter.label.trim()
        ? filter.label
        : `Filter ${index + 1}`;
    branches.push(`${condition}, ${escapeStringLiteral(label)}`);
    conditions.push(condition);
  }
  return {
    caseExpr: `CASE(${branches.join(', ')})`,
    matchWhere: conditions.length === 1 ? conditions[0]! : `(${conditions.join(' OR ')})`,
  };
};
