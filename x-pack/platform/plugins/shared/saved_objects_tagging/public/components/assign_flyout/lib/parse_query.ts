/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@elastic/eui';

export interface ParsedQuery {
  /**
   * Combined value of the term clauses
   */
  queryText?: string;
  /**
   * The values of the `type` field clause (that are populated by the `type` filter)
   */
  selectedTypes?: string[];
}

export function parseQuery(query: Query): ParsedQuery {
  let queryText: string | undefined;
  let selectedTypes: string[] | undefined;

  if (query) {
    if (query.ast.getTermClauses().length) {
      queryText = query.ast
        .getTermClauses()
        .map((clause: any) => clause.value)
        .join(' ');
    }
    if (query.ast.getFieldClauses('type')) {
      selectedTypes = query.ast.getFieldClauses('type')[0].value as string[];
    }
  }

  return {
    queryText,
    selectedTypes,
  };
}
