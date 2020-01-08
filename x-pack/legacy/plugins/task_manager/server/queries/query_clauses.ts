/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface TermBoolClause {
  term: { [field: string]: string | string[] };
}
export interface RangeBoolClause {
  range: { [field: string]: { lte: string | number } | { lt: string | number } };
}
export interface ExistsBoolClause {
  exists: { field: string };
}

export interface IDsClause {
  ids: {
    values: string[];
  };
}
export interface ShouldClause<T> {
  should: Array<BoolClause<T> | IDsClause | T>;
}
export interface MustClause<T> {
  must: Array<BoolClause<T> | IDsClause | T>;
}
export interface BoolClause<T> {
  bool: MustClause<T> | ShouldClause<T>;
}
export interface SortClause {
  _script: {
    type: string;
    order: string;
    script: {
      lang: string;
      source: string;
      params?: { [param: string]: string | string[] };
    };
  };
}
export interface ScriptClause {
  source: string;
  lang: string;
  params: {
    [field: string]: string | number | Date;
  };
}
export interface UpdateByQuery<T> {
  query: BoolClause<T>;
  sort: SortClause;
  seq_no_primary_term: true;
  script: ScriptClause;
}

export function shouldBeOneOf<T>(
  ...should: Array<BoolClause<T> | IDsClause | T>
): {
  bool: ShouldClause<T>;
} {
  return {
    bool: {
      should,
    },
  };
}

export function mustBeAllOf<T>(
  ...must: Array<BoolClause<T> | IDsClause | T>
): {
  bool: MustClause<T>;
} {
  return {
    bool: {
      must,
    },
  };
}

export function asUpdateByQuery<T>({
  query,
  update,
  sort,
}: {
  query: BoolClause<T>;
  update: ScriptClause;
  sort: SortClause;
}): UpdateByQuery<T> {
  return {
    query,
    sort,
    seq_no_primary_term: true,
    script: update,
  };
}
