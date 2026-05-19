import type { ElasticsearchClient } from '@kbn/core/server';
import type { KnowledgeBaseItem } from '../../../../common/types';
export declare const INTEGRATION_KNOWLEDGE_INDEX = ".integration_knowledge";
export declare const DEFAULT_SIZE = 1000;
export declare function saveKnowledgeBaseContentToIndex({ esClient, pkgName, pkgVersion, knowledgeBaseContent, abortController, }: {
    esClient: ElasticsearchClient;
    pkgName: string;
    pkgVersion: string;
    knowledgeBaseContent: KnowledgeBaseItem[];
    abortController?: AbortController;
}): Promise<string[]>;
export declare function getPackageKnowledgeBaseFromIndex(esClient: ElasticsearchClient, pkgName: string, abortController?: AbortController): Promise<KnowledgeBaseItem[]>;
export declare function deletePackageKnowledgeBase(esClient: ElasticsearchClient, pkgName: string, abortController?: AbortController): Promise<void>;
