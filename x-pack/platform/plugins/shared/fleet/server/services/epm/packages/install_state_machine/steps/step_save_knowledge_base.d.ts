import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { InstallContext } from '../_state_machine_package_install';
import { type ArchiveIterator } from '../../../../../../common/types/models/epm';
import type { EsAssetReference } from '../../../../../types';
export declare const KNOWLEDGE_BASE_PATH = "docs/knowledge_base/";
export declare const DOCS_PATH_PATTERN = "/docs/";
export declare const KNOWLEDGE_BASE_FOLDER = "knowledge_base/";
export declare function stepSaveKnowledgeBase(context: InstallContext): Promise<{
    esReferences: EsAssetReference[];
}>;
export declare function indexKnowledgeBase(esReferences: EsAssetReference[], savedObjectsClient: SavedObjectsClientContract, esClient: ElasticsearchClient, logger: Logger, packageInfo: {
    name: string;
    version: string;
}, archiveIterator: ArchiveIterator, abortController?: AbortController): Promise<{
    esReferences: EsAssetReference[];
}>;
export declare function cleanupKnowledgeBaseStep(context: InstallContext): Promise<void>;
