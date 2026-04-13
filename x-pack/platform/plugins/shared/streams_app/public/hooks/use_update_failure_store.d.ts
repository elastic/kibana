import type { Streams } from '@kbn/streams-schema';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
export declare function useUpdateFailureStore(definition: Streams.ingest.all.Definition): {
    updateFailureStore: (name: string, failureStore: FailureStore) => Promise<import("../../../streams/server/lib/streams/client").UpsertStreamResponse>;
};
