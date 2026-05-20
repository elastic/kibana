import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract, ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { SmlTypeRegistry } from './sml_type_registry';
import type { SmlIndexAction } from './types';
export interface SmlIndexerDeps {
    registry: SmlTypeRegistry;
    logger: Logger;
}
export interface SmlIndexer {
    /**
     * Index, update, or delete SML data for a specific item.
     */
    indexAttachment: (params: {
        originId: string;
        attachmentType: string;
        action: SmlIndexAction;
        spaces: string[];
        esClient: ElasticsearchClient;
        savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
        logger: Logger;
    }) => Promise<void>;
}
export declare const createSmlIndexer: ({ registry, logger }: SmlIndexerDeps) => SmlIndexer;
