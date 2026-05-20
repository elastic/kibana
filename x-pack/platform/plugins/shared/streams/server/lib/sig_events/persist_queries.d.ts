import type { GeneratedSignificantEventQuery } from '@kbn/streams-schema';
import type { QueryClient } from '../streams/assets/query/query_client';
import type { StreamsClient } from '../streams/client';
export interface PersistQueriesResult {
    persistedQueries: Array<GeneratedSignificantEventQuery & {
        id: string;
    }>;
    skippedQueries: GeneratedSignificantEventQuery[];
}
export declare function persistQueries(streamName: string, queries: GeneratedSignificantEventQuery[], deps: {
    queryClient: QueryClient;
    streamsClient: StreamsClient;
}): Promise<PersistQueriesResult>;
