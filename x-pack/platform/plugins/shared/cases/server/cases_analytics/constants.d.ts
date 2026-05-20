import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Owner } from '../../common/constants/types';
import { CAI_ATTACHMENTS_SYNC_TYPE } from './attachments_index/constants';
import { CAI_CASES_SYNC_TYPE } from './cases_index/constants';
import { CAI_COMMENTS_SYNC_TYPE } from './comments_index/constants';
import { CAI_ACTIVITY_SYNC_TYPE } from './activity_index/constants';
export declare const CAI_NUMBER_OF_SHARDS = 1;
/** Allocate 1 replica if there are enough data nodes, otherwise continue with 0 */
export declare const CAI_AUTO_EXPAND_REPLICAS = "0-1";
export declare const CAI_REFRESH_INTERVAL = "15s";
export declare const CAI_INDEX_MODE = "lookup";
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
export declare const CAI_DEFAULT_TIMEOUT = "300s";
export type CAISyncType = typeof CAI_CASES_SYNC_TYPE | typeof CAI_COMMENTS_SYNC_TYPE | typeof CAI_ATTACHMENTS_SYNC_TYPE | typeof CAI_ACTIVITY_SYNC_TYPE;
export declare const CAISyncTypes: readonly ["cai_cases_sync", "cai_comments_sync", "cai_attachments_sync", "cai_activity_sync"];
export declare const SYNCHRONIZATION_QUERIES_DICTIONARY: Record<string, (lastSyncAt: Date, spaceId: string, owner: Owner) => QueryDslQueryContainer>;
export declare const sourceIndexBySyncType: (syncType: CAISyncType) => string;
export declare const destinationIndexBySyncType: (syncType: CAISyncType, spaceId: string, owner: Owner) => string;
