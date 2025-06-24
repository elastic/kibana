/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import {
  CAI_ATTACHMENTS_INDEX_NAME,
  getAttachmentsSynchronizationSourceQuery,
} from './attachments_index/constants';
import { CAI_CASES_INDEX_NAME, getCasesSynchronizationSourceQuery } from './cases_index/constants';
import {
  CAI_COMMENTS_INDEX_NAME,
  getCommentsSynchronizationSourceQuery,
} from './comments_index/constants';
import {
  CAI_ACTIVITY_INDEX_NAME,
  getActivitySynchronizationSourceQuery,
} from './activity_index/constants';

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

export const SYNCHRONIZATION_QUERIES_DICTIONARY: Record<
  string,
  (lastSyncAt: Date) => QueryDslQueryContainer
> = {
  [CAI_CASES_INDEX_NAME]: getCasesSynchronizationSourceQuery,
  [CAI_COMMENTS_INDEX_NAME]: getCommentsSynchronizationSourceQuery,
  [CAI_ATTACHMENTS_INDEX_NAME]: getAttachmentsSynchronizationSourceQuery,
  [CAI_ACTIVITY_INDEX_NAME]: getActivitySynchronizationSourceQuery,
};
