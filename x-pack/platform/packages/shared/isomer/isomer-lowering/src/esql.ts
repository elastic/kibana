/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartSelection, SelectionPredicate } from './selection';

import { escapeEsqlIdentifier, esqlStringLiteral } from './kibana/from-saved-object/lens/esql';
import { injectWherePredicates } from './kibana/plan/inject_where';

const scalarLiteral = (value: string | number | boolean): string => {
  if (typeof value === 'string') {
    return esqlStringLiteral(value);
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`selection value ${value} is not finite`);
  }
  return String(value);
};

const boundLiteral = (bound: number | string): string =>
  typeof bound === 'number' ? scalarLiteral(bound) : `TO_DATETIME(${esqlStringLiteral(bound)})`;

/** One predicate as ES|QL; a string range bound is a date, a number bound a histogram edge. */
export const predicateToEsql = ({ field, value, range }: SelectionPredicate): string => {
  const column = escapeEsqlIdentifier(field);
  const parts = [
    ...(value === undefined ? [] : [`${column} == ${scalarLiteral(value)}`]),
    ...(range === undefined
      ? []
      : [`${column} >= ${boundLiteral(range.gte)}`, `${column} < ${boundLiteral(range.lt)}`]),
  ];
  if (parts.length === 0) {
    throw new Error(`selection predicate on ${field} has neither value nor range`);
  }
  return parts.join(' AND ');
};

/** Selections are ANDed with each other, as are each selection's predicates. */
export const selectionsToEsql = (selections: readonly ChartSelection[]): string[] =>
  selections.flatMap(({ predicates }) => predicates.map(predicateToEsql));

/** ANDs predicates onto the leading `WHERE`, never one after a `STATS`. */
export const injectWhere = (esql: string, predicates: readonly string[]): string =>
  injectWherePredicates(esql, [...predicates]);
