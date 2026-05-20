import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import type { Streams } from '@kbn/streams-schema';
import type { StreamsClient } from '../client';
export declare function getEffectiveLifecycle({ definition, streamsClient, dataStream, }: {
    definition: Streams.ingest.all.Definition;
    streamsClient: StreamsClient;
    dataStream: IndicesDataStream;
}): Promise<import("@kbn/streams-schema").IngestStreamLifecycleDSL | import("@kbn/streams-schema").IngestStreamLifecycleILM | import("@kbn/streams-schema/src/models/ingest/lifecycle").IngestStreamLifecycleError | import("@kbn/streams-schema").IngestStreamLifecycleInherit | import("@kbn/streams-schema").IngestStreamLifecycleDisabled>;
