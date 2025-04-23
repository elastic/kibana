/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export const CAI_NUMBER_OF_SHARDS = 1;
/** Allocate 1 replica if there are enough data nodes, otherwise continue with 0 */
export const CAI_AUTO_EXPAND_REPLICAS = '0-1';
export const CAI_REFRESH_INTERVAL = '15s';
export const CAI_INDEX_MODE = 'lookup';
/**
 * When a request takes a long time to complete and hits the timeout or the
 * client aborts that request due to the requestTimeout, our only course of
 * action is to retry that request. This places our request at the end of the
 * queue and adds more load to Elasticsearch just making things worse.
 *
 * So we want to choose as long a timeout as possible. Some load balancers /
 * reverse proxies like ELB ignore TCP keep-alive packets so unless there's a
 * request or response sent over the socket it will be dropped after 60s.
 */
export const CAI_DEFAULT_TIMEOUT = '300s';

export const CAI_CASES_INDEX_NAME = '.internal.cases';
export const CAI_ATTACHMENTS_INDEX_NAME = '.internal.cases-attachments';
export const CAI_COMMENTS_INDEX_NAME = '.internal.cases-comments';

export const CAI_CASES_SOURCE_QUERY: QueryDslQueryContainer = {
  term: {
    type: 'cases',
  },
};
export const CAI_ATTACHMENTS_SOURCE_QUERY: QueryDslQueryContainer = {
  bool: {
    must: {
      match: {
        type: 'cases-comments',
      },
    },
    filter: {
      bool: {
        must_not: {
          term: {
            'cases-comments.type': 'user',
          },
        },
      },
    },
  },
};
export const CAI_COMMENTS_SOURCE_QUERY: QueryDslQueryContainer = {
  bool: {
    filter: [
      {
        term: {
          type: 'cases-comments',
        },
      },
      {
        term: {
          'cases-comments.type': 'user',
        },
      },
    ],
  },
};

export const CAI_CASES_SOURCE_INDEX = '.kibana_alerting_cases';
export const CAI_ATTACHMENTS_SOURCE_INDEX = '.kibana_alerting_cases';
export const CAI_COMMENTS_SOURCE_INDEX = '.kibana_alerting_cases';
