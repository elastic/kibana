/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
export interface MustCondition {
  bool: Pick<estypes.QueryDslBoolQuery, 'must'>;
}
export interface MustNotCondition {
  bool: Pick<estypes.QueryDslBoolQuery, 'must_not'>;
}
export interface ScriptBasedSortClause {
  _script: {
    type: string;
    order: string;
    script: ScriptClause;
  };
}
export interface ScriptClause {
  source: string;
  lang: estypes.ScriptLanguage;
  params?: {
    [field: string]:
      | string
      | number
      | Date
      | string[]
      | {
          [field: string]: string | number | Date;
        };
  };
}
export type PinnedQuery = Pick<NonNullable<estypes.QueryDslQueryContainer>, 'pinned'>;
type BoolClause = Pick<NonNullable<estypes.QueryDslQueryContainer>, 'bool'>;
export declare function matchesClauses(...clauses: Array<BoolClause | undefined>): BoolClause;
export declare function shouldBeOneOf(...should: estypes.QueryDslQueryContainer[]): {
  bool: {
    should: estypes.QueryDslQueryContainer[];
  };
};
export declare function mustBeAllOf(...must: estypes.QueryDslQueryContainer[]): {
  bool: {
    must: estypes.QueryDslQueryContainer[];
  };
};
export declare function filterDownBy(...filter: estypes.QueryDslQueryContainer[]): {
  bool: {
    filter: estypes.QueryDslQueryContainer[];
  };
};
export {};
