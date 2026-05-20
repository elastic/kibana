import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { SignificantEventsPreviewResponse } from '@kbn/streams-schema';
export declare function previewSignificantEvents(params: {
    esqlQuery: string;
    from: Date;
    to: Date;
    bucketSize: string;
    timestampField?: string;
}, dependencies: {
    scopedClusterClient: IScopedClusterClient;
    logger?: Logger;
}): Promise<SignificantEventsPreviewResponse>;
