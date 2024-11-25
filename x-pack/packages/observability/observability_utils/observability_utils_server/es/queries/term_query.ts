/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

interface TermQueryOpts {
  queryEmptyString: boolean;
}

export function termQuery<T extends string>(
  field: T,
  value: string | boolean | number | undefined | null,
  opts: TermQueryOpts = { queryEmptyString: true }
): QueryDslQueryContainer[] {
  if (value === null || value === undefined || (!opts.queryEmptyString && value === '')) {
    return [];
  }

  return [{ term: { [field]: value } }];
}
