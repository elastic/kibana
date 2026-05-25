/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { LatestSourceWhereCondition } from '../../sig_events/latest_source_query';
export const andWhere = (
  current: LatestSourceWhereCondition | undefined,
  next: LatestSourceWhereCondition
): LatestSourceWhereCondition => {
  return current ? esql.exp`${current} AND ${next}` : next;
};

export const combineWhere = (
  ...conditions: Array<LatestSourceWhereCondition | undefined>
): LatestSourceWhereCondition | undefined => {
  return conditions.reduce<LatestSourceWhereCondition | undefined>(
    (acc, next) => (next ? (acc ? esql.exp`${acc} AND ${next}` : next) : acc),
    undefined
  );
};

export const inPredicate = <T extends string>(
  column: string,
  values: T[]
): LatestSourceWhereCondition | undefined => {
  if (values.length === 0) return undefined;
  const literals = values.map((v) => esql.str(v));
  return esql.exp`${esql.col(column)} IN (${literals})`;
};

export const IS_NOT_DELETED: LatestSourceWhereCondition =
  esql.exp`deleted IS NULL OR deleted == false`;

export const IS_NOT_EXCLUDED: LatestSourceWhereCondition =
  esql.exp`excluded IS NULL OR excluded == false`;
