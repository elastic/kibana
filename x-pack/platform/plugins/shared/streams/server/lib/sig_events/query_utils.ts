/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  esql,
  type ComposerQuery,
  type ComposerQueryTagHole,
  type ComposerSortShorthand,
} from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';

export interface CommonSearchOptions {
  /** ISO 8601 formatted datetime */
  from?: string;
  /** ISO 8601 formatted datetime */
  to?: string;
}

/** Shared `field:order` sort tokens used by every sig_events client. */
export type TimestampSort = '@timestamp:asc' | '@timestamp:desc';

export type WhereCondition = ESQLAstExpression & ComposerQueryTagHole;

export const inList = (col: string, values: string[]): WhereCondition => {
  const literals = values.map((v) => esql.str(v));
  return esql.exp`${esql.col(col)} IN (${literals})`;
};

/**
 * Translate a `"field:order"` string (as exposed on HTTP routes) into the
 * `ComposerSortShorthand` shape used by the ES|QL composer.
 */
export const parseSort = (token: string): ComposerSortShorthand => {
  const colonIdx = token.lastIndexOf(':');
  if (colonIdx === -1) {
    return token;
  }
  const column = token.slice(0, colonIdx);
  const direction = token.slice(colonIdx + 1).toUpperCase() as 'ASC' | 'DESC';
  return [column, direction];
};

export const applyTimeWindow = (
  query: ComposerQuery,
  options: CommonSearchOptions
): ComposerQuery => {
  let next = query;
  if (options.from !== undefined) {
    next = next.where`@timestamp >= TO_DATETIME(${esql.str(options.from)})`;
  }
  if (options.to !== undefined) {
    next = next.where`@timestamp <= TO_DATETIME(${esql.str(options.to)})`;
  }
  return next;
};

export const collapseToLatest = (query: ComposerQuery, groupBy: string): ComposerQuery =>
  query.pipe`INLINE STATS latest_ts = MAX(@timestamp) BY ${esql.col(groupBy)}`
    .where`@timestamp == latest_ts`.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY ${esql.col(
    groupBy
  )}`.where`_id == tiebreaker_id`;

interface FilterArgs<T, K extends keyof T & string> {
  query: ComposerQuery;
  options: T;
  key: K;
  /** ES|QL column name; defaults to `key` when omitted. */
  column?: string;
}

export const applyFilter = <T, K extends keyof T & string>({
  query,
  options,
  key,
  column,
}: FilterArgs<T, K>): ComposerQuery => {
  const value = options[key];
  if (value === undefined || value === null) {
    return query;
  }
  const col = column ?? key;
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return query;
    }
    return query.where`${inList(col, value)}`;
  }
  if (typeof value === 'string') {
    return query.where`${esql.col(col)} == ${esql.str(value)}`;
  }
  if (typeof value === 'boolean') {
    return query.where`${esql.col(col)} == ${value}`;
  }
  return query;
};
