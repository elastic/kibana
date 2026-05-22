/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';

/**
 * Builds an ES|QL query string that counts documents in one or more indices,
 * optionally filtered by a KQL expression. Time filtering is expected to be
 * applied via the `filter` parameter on the ES|QL query API by the caller.
 */
export function buildCountQuery({
  index,
  kql,
}: {
  index: string | string[];
  kql?: string;
}): string {
  let query = esql.from(Array.isArray(index) ? index : [index]);

  if (kql) {
    query = query.where`KQL(${esql.str(kql)})`;
  }

  return query.pipe`STATS total = COUNT(*)`.print('basic');
}
