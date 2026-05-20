import type { StreamQuery, WiredIngestUpsertRequest } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import type { ClassicIngestUpsertRequest } from '@kbn/streams-schema';
import type { UpsertStreamResponse } from '../client';
import type { StreamsClient } from '../client';
import type { AttachmentClient } from '../attachments/attachment_client';
import type { QueryClient } from '../assets/query/query_client';
export declare function getStreamAssets({ name, queryClient, attachmentClient, }: {
    name: string;
    queryClient: QueryClient;
    attachmentClient: AttachmentClient;
}): Promise<{
    dashboards: string[];
    queries: StreamQuery[];
    rules: string[];
}>;
export declare function updateWiredIngest({ streamsClient, queryClient, attachmentClient, name, ingest, description, }: {
    streamsClient: StreamsClient;
    queryClient: QueryClient;
    attachmentClient: AttachmentClient;
    name: string;
    ingest: WiredIngestUpsertRequest;
    description?: string;
}): Promise<UpsertStreamResponse>;
export declare function updateClassicIngest({ streamsClient, queryClient, attachmentClient, name, ingest, description, }: {
    streamsClient: StreamsClient;
    queryClient: QueryClient;
    attachmentClient: AttachmentClient;
    name: string;
    ingest: ClassicIngestUpsertRequest;
    description?: string;
}): Promise<UpsertStreamResponse>;
export interface StreamPatch {
    ingest: Streams.ingest.all.Definition['ingest'];
    description?: string;
}
export declare function patchIngestAndUpsert({ streamsClient, queryClient, attachmentClient, name, patchFn, }: {
    streamsClient: StreamsClient;
    queryClient: QueryClient;
    attachmentClient: AttachmentClient;
    name: string;
    patchFn: (definition: Streams.ingest.all.Definition) => StreamPatch;
}): Promise<UpsertStreamResponse>;
