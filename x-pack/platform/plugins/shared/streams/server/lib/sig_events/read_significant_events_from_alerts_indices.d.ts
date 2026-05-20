import type { IScopedClusterClient } from '@kbn/core/server';
import type { SignificantEventsGetResponse } from '@kbn/streams-schema';
import type { SearchMode } from '../../../common/queries';
import type { QueryClient, QueryLinkFilters } from '../streams/assets/query/query_client';
export declare function readSignificantEventsFromAlertsIndices(params: {
    streamNames?: string[];
    from: Date;
    to: Date;
    bucketSize: string;
    query?: string;
    filters?: QueryLinkFilters;
    searchMode?: SearchMode;
}, dependencies: {
    queryClient: QueryClient;
    scopedClusterClient: IScopedClusterClient;
}): Promise<SignificantEventsGetResponse>;
