/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Insert predicates into an existing ES|QL string. ANDs onto a *leading*
 * `WHERE`, otherwise inserts one directly after the source command.
 *
 * Only the first pipeline command is eligible for the merge. Matching any
 * `WHERE` put dashboard predicates into a post-aggregation filter — in
 * `FROM logs | STATS count = COUNT(*) BY service | WHERE count > 10` the
 * predicate landed after the `STATS`, where the source fields it names no
 * longer exist and the query fails outright.
 */
export const injectWherePredicates = (esql: string, predicates: string[]): string => {
  const extra = predicates.map((part) => part.trim()).filter((part) => part.length > 0);
  if (extra.length === 0) {
    return esql;
  }
  const clause = extra.length === 1 ? extra[0]! : extra.map((part) => `(${part})`).join(' AND ');
  const pipe = esql.indexOf('|');
  if (pipe < 0) {
    return `${esql.trimEnd()} | WHERE ${clause}`;
  }
  const leadingWhere = /^\|\s*WHERE\s+/i.exec(esql.slice(pipe));
  if (leadingWhere) {
    const insertAt = pipe + leadingWhere[0].length;
    return `${esql.slice(0, insertAt)}(${clause}) AND ${esql.slice(insertAt)}`;
  }
  return `${esql.slice(0, pipe).trimEnd()} | WHERE ${clause} ${esql.slice(pipe)}`;
};
