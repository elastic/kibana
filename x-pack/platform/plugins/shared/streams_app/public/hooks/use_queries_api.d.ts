import type { StreamQuery } from '@kbn/streams-schema';
interface QueriesApi {
    promote: ({ queryIds }: {
        queryIds: string[];
    }) => Promise<{
        promoted: number;
    }>;
    promoteAll: () => Promise<{
        promoted: number;
    }>;
    upsertQuery: ({ query, streamName }: {
        query: StreamQuery;
        streamName: string;
    }) => Promise<void>;
    removeQuery: ({ queryId, streamName }: {
        queryId: string;
        streamName: string;
    }) => Promise<void>;
    getUnbackedQueriesCount: (signal?: AbortSignal | null) => Promise<{
        count: number;
    }>;
    abort: () => void;
}
export declare function useQueriesApi(): QueriesApi;
export {};
