import type { DataTableRecord } from '@kbn/discover-utils';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
export declare function useResolvedDefinitionName({ streamsRepositoryClient, doc, }: {
    streamsRepositoryClient: StreamsRepositoryClient;
    doc: DataTableRecord;
}): import("@kbn/react-hooks").AbortableAsyncState<string | undefined>;
