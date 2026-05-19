import type { AggregationsStringTermsBucketKeys } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SavedObjectTypesToQuery } from './run_invalidate';
interface QueryForApiKeysInUseOpts {
    apiKeyIds: string[];
    savedObjectTypeToQuery: SavedObjectTypesToQuery;
    savedObjectsClient: SavedObjectsClientContract;
}
export declare function queryForApiKeysInUse(opts: QueryForApiKeysInUseOpts): Promise<AggregationsStringTermsBucketKeys[]>;
export {};
