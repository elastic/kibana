import type { StreamQuery } from '@kbn/streams-schema';
interface SignificantEventsApiBulkOperationCreate {
    index: StreamQuery;
}
interface SignificantEventsApiBulkOperationDelete {
    delete: {
        id: string;
    };
}
type SignificantEventsApiBulkOperation = SignificantEventsApiBulkOperationCreate | SignificantEventsApiBulkOperationDelete;
interface SignificantEventsApi {
    upsertQuery: (query: StreamQuery) => Promise<void>;
    removeQuery: (id: string) => Promise<void>;
    bulk: (operations: SignificantEventsApiBulkOperation[]) => Promise<void>;
}
export declare function useSignificantEventsApi({ name }: {
    name: string;
}): SignificantEventsApi;
export {};
