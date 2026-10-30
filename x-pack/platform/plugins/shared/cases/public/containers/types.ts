/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { FilterOptions } from '../../common/ui';

export * from '../../common/ui';

/** Cases list filters. `statusKey` holds the statuses to filter by when custom statuses are on. */
export type CasesFilterOptions = FilterOptions & { statusKey?: string[] };
export type FeatureIdsResponse = estypes.SearchResponse<
  unknown,
  {
    consumer: {
      buckets: Array<{ key: string; doc_count: number }>;
    };
    producer: {
      buckets: Array<{ key: string; doc_count: number }>;
    };
    ruleTypeIds: {
      buckets: Array<{ key: string; doc_count: number }>;
    };
  }
>;
