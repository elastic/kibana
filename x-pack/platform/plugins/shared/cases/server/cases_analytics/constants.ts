/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import type { Owner } from '../../common/constants/types';
import {
  CAI_ATTACHMENTS_SOURCE_INDEX,
  CAI_ATTACHMENTS_SYNC_TYPE,
  getAttachmentsDestinationIndexName,
  getAttachmentsSynchronizationSourceQuery,
} from './attachments_index/constants';
import {
  CAI_CASES_SOURCE_INDEX,
  CAI_CASES_SYNC_TYPE,
  getCasesDestinationIndexName,
  getCasesSynchronizationSourceQuery,
} from './cases_index/constants';
import {
  CAI_COMMENTS_SOURCE_INDEX,
  CAI_COMMENTS_SYNC_TYPE,
  getCommentsDestinationIndexName,
  getCommentsSynchronizationSourceQuery,
} from './comments_index/constants';
import {
  CAI_ACTIVITY_SOURCE_INDEX,
  CAI_ACTIVITY_SYNC_TYPE,
  getActivityDestinationIndexName,
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

export type CAISyncType =
  | typeof CAI_CASES_SYNC_TYPE
  | typeof CAI_COMMENTS_SYNC_TYPE
  | typeof CAI_ATTACHMENTS_SYNC_TYPE
  | typeof CAI_ACTIVITY_SYNC_TYPE;

export const CAISyncTypes = [
  CAI_CASES_SYNC_TYPE,
  CAI_COMMENTS_SYNC_TYPE,
  CAI_ATTACHMENTS_SYNC_TYPE,
  CAI_ACTIVITY_SYNC_TYPE,
] as const;

export const SYNCHRONIZATION_QUERIES_DICTIONARY: Record<
  string,
  (lastSyncAt: Date, spaceId: string, owner: Owner) => QueryDslQueryContainer
> = {
  [CAI_CASES_SYNC_TYPE]: getCasesSynchronizationSourceQuery,
  [CAI_COMMENTS_SYNC_TYPE]: getCommentsSynchronizationSourceQuery,
  [CAI_ATTACHMENTS_SYNC_TYPE]: getAttachmentsSynchronizationSourceQuery,
  [CAI_ACTIVITY_SYNC_TYPE]: getActivitySynchronizationSourceQuery,
};

export const sourceIndexBySyncType = (syncType: CAISyncType): string => {
  switch (syncType) {
    case CAI_CASES_SYNC_TYPE:
      return CAI_CASES_SOURCE_INDEX;
    case CAI_COMMENTS_SYNC_TYPE:
      return CAI_COMMENTS_SOURCE_INDEX;
    case CAI_ATTACHMENTS_SYNC_TYPE:
      return CAI_ATTACHMENTS_SOURCE_INDEX;
    case CAI_ACTIVITY_SYNC_TYPE:
      return CAI_ACTIVITY_SOURCE_INDEX;
    default:
      throw new Error(`[sourceIndexBySyncType]: Unknown sync type: ${syncType}`);
  }
};

export const destinationIndexBySyncType = (
  syncType: CAISyncType,
  spaceId: string,
  owner: Owner
): string => {
  switch (syncType) {
    case CAI_CASES_SYNC_TYPE:
      return getCasesDestinationIndexName(spaceId, owner);
    case CAI_COMMENTS_SYNC_TYPE:
      return getCommentsDestinationIndexName(spaceId, owner);
    case CAI_ATTACHMENTS_SYNC_TYPE:
      return getAttachmentsDestinationIndexName(spaceId, owner);
    case CAI_ACTIVITY_SYNC_TYPE:
      return getActivityDestinationIndexName(spaceId, owner);
    default:
      throw new Error(`[destinationIndexBySyncType]: Unknown sync type: ${syncType}`);
  }
};
