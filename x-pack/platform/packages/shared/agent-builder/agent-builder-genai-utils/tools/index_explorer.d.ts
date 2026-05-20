import type { Logger } from '@kbn/logging';
import { EsResourceType } from '@kbn/agent-builder-common';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export interface RelevantResource {
    type: EsResourceType;
    name: string;
    reason: string;
}
export interface IndexExplorerResponse {
    resources: RelevantResource[];
}
export interface ResourceFieldDescriptor {
    path: string;
    type: string;
}
export interface ResourceDescriptor {
    type: EsResourceType;
    name: string;
    description?: string;
    fields?: ResourceFieldDescriptor[];
}
/**
 * Gathers resource descriptors (with field names and types) for all resources
 * matching the given pattern.
 */
export declare const gatherResourceDescriptors: ({ indexPattern, includeAliases, includeDatastream, esClient, }: {
    indexPattern?: string;
    includeAliases?: boolean;
    includeDatastream?: boolean;
    esClient: ElasticsearchClient;
}) => Promise<ResourceDescriptor[]>;
export declare const indexExplorer: ({ nlQuery, indexPattern, includeAliases, includeDatastream, limit, esClient, model, logger, }: {
    nlQuery: string;
    indexPattern?: string;
    includeAliases?: boolean;
    includeDatastream?: boolean;
    limit?: number;
    esClient: ElasticsearchClient;
    model: ScopedModel;
    logger?: Logger;
}) => Promise<IndexExplorerResponse>;
export interface SelectedResource {
    type: EsResourceType;
    name: string;
    reason: string;
}
export declare const formatResource: (res: ResourceDescriptor) => string;
export declare const createIndexSelectorPrompt: ({ resources, nlQuery, limit, }: {
    resources: ResourceDescriptor[];
    nlQuery: string;
    limit?: number;
}) => BaseMessageLike[];
