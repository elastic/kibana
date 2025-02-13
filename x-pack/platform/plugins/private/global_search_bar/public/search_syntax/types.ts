/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type FilterValueType = string | boolean | number;

export type FilterValues<ValueType extends FilterValueType = FilterValueType> = ValueType[];

export interface ParsedSearchParams {
  /**
   * The parsed search term.
   * Can be undefined if the query was only composed of field terms.
   */
  term?: string;
  /**
   * The filters extracted from the field terms.
   */
  filters: {
    /**
     * Aggregation of `tag` and `tags` field clauses
     */
    tags?: FilterValues<string>;
    /**
     * Aggregation of `type` and `types` field clauses
     */
    types?: FilterValues<string>;
  };
}
