/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerSortShorthand } from '@elastic/esql';
import type { LatestSourceWhereCondition } from './latest_source_query';

export interface CommonSearchOptions {
  /** ISO 8601 formatted datetime */
  from?: string;
  /** ISO 8601 formatted datetime */
  to?: string;
}

export const inList = (col: string, values: string[]): LatestSourceWhereCondition => {
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
