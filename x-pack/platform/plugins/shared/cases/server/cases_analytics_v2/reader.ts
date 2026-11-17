/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { KpiMetricIndex } from '../../common/constants';
import { ACTIVITY_INDEX_NAME, ATTACHMENTS_INDEX_NAME, CASE_INDEX_NAME } from './constants';

const INDEX_NAME_BY_ANALYTICS_INDEX: Record<KpiMetricIndex, string> = {
  cases: CASE_INDEX_NAME,
  activity: ACTIVITY_INDEX_NAME,
  attachments: ATTACHMENTS_INDEX_NAME,
};

export interface CasesAnalyticsV2SearchRequest {
  index: KpiMetricIndex;
  body: estypes.SearchSearchRequestBody;
}

/**
 * Read-only access to the analytics indices. The caller names a logical index, never an index name,
 * so the internal user can only search `.cases`, `.cases-activity`, and `.cases-attachments`.
 */
export interface CasesAnalyticsV2ReaderContract {
  msearch: (requests: CasesAnalyticsV2SearchRequest[]) => Promise<estypes.MsearchResponseItem[]>;
}

export const V2_NOOP_READER: CasesAnalyticsV2ReaderContract = {
  msearch: async () => {
    throw new Error('cases-analyticsV2: the analytics reader is not available');
  },
};

export const createCasesAnalyticsV2Reader = (
  esClient: ElasticsearchClient
): CasesAnalyticsV2ReaderContract => ({
  msearch: async (requests) => {
    if (requests.length === 0) {
      return [];
    }

    const { responses } = await esClient.msearch({
      searches: requests.flatMap(({ index, body }) => [
        { index: INDEX_NAME_BY_ANALYTICS_INDEX[index] },
        body,
      ]),
    });

    return responses;
  },
});
