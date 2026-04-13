import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
interface StreamsFetchResult {
    streams: ListStreamDetail[];
    canReadFailureStore: boolean;
}
export declare function useFetchStreams(options?: {
    select?: (result: StreamsFetchResult) => StreamsFetchResult;
}): import("@kbn/react-query").UseQueryResult<StreamsFetchResult, Error>;
export {};
