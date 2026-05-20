import { Streams } from '@kbn/streams-schema';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { AttachmentClient } from '../../../lib/streams/attachments/attachment_client';
import type { QueryClient } from '../../../lib/streams/assets/query/query_client';
import type { StreamsClient } from '../../../lib/streams/client';
export declare function readStream({ name, queryClient, attachmentClient, streamsClient, scopedClusterClient, logger, }: {
    name: string;
    queryClient: QueryClient;
    attachmentClient: AttachmentClient;
    streamsClient: StreamsClient;
    scopedClusterClient: IScopedClusterClient;
    logger: Logger;
}): Promise<Streams.all.GetResponse>;
