/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResult } from '../log_search_result';

export interface SearchSummaryBucket {
  start: number;
  end: number;
  count: number;
  representative: SearchResult;
}
