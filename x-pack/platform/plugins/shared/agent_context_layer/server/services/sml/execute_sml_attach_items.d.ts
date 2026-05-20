import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { SmlService } from './types';
export type SmlResolvedItemResult = {
    success: true;
    chunk_id: string;
    attachment: {
        type: string;
        data: unknown;
        origin: string;
        description: string;
    };
} | {
    success: false;
    chunk_id: string;
    attachment_type?: string;
    message: string;
};
/**
 * Resolves SML index hits into attachment data (access checks, fetch, toAttachment).
 * Does NOT persist — callers are responsible for adding the returned attachments
 * to the conversation via their own `AttachmentStateManager`.
 *
 * Used by the `sml_attach` built-in tool and the internal HTTP `_attach` route.
 */
export declare const resolveSmlAttachItems: ({ chunkIds, sml, esClient, request, spaceId, savedObjectsClient, logger, }: {
    chunkIds: string[];
    sml: SmlService;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    spaceId: string;
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
}) => Promise<SmlResolvedItemResult[]>;
