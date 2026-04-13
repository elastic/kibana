import type { Streams } from '@kbn/streams-schema';
import { type IngestStreamLifecycle } from '@kbn/streams-schema';
export declare const useUpdateStreamLifecycle: (definition: Streams.ingest.all.GetResponse) => {
    updateStreamLifecycle: (lifecycle: IngestStreamLifecycle) => Promise<void>;
};
