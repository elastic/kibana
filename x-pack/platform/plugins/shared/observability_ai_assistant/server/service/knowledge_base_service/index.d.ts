import type { CoreSetup, ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { DocumentationManagerAPI } from '@kbn/product-doc-base-plugin/server/services/doc_manager';
import type { Instruction, KnowledgeBaseEntry } from '../../../common/types';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import type { ObservabilityAIAssistantConfig } from '../../config';
interface Dependencies {
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
    logger: Logger;
    config: ObservabilityAIAssistantConfig;
    productDoc: DocumentationManagerAPI;
}
export interface RecalledEntry {
    id: string;
    title?: string;
    text: string;
    esScore: number | null;
    labels?: Record<string, string>;
}
export declare class KnowledgeBaseService {
    private readonly dependencies;
    constructor(dependencies: Dependencies);
    private recallFromKnowledgeBase;
    private recallFromIntegrationsKnowledge;
    recall: ({ user, queries, categories, namespace, esClient, uiSettingsClient, limit, }: {
        queries: Array<{
            text: string;
            boost?: number;
        }>;
        categories?: string[];
        user?: {
            name: string;
        };
        namespace: string;
        esClient: {
            asCurrentUser: ElasticsearchClient;
            asInternalUser: ElasticsearchClient;
        };
        uiSettingsClient: IUiSettingsClient;
        limit?: {
            tokens?: number;
            size?: number;
        };
    }) => Promise<RecalledEntry[]>;
    getUserInstructions: (namespace: string, user?: {
        name: string;
    }) => Promise<Array<Instruction & {
        public?: boolean;
    }>>;
    getEntries: ({ query, sortBy, sortDirection, namespace, }: {
        query?: string;
        sortBy?: string;
        sortDirection?: "asc" | "desc";
        namespace: string;
    }) => Promise<{
        entries: KnowledgeBaseEntry[];
    }>;
    hasEntries: () => Promise<boolean>;
    getPersonalUserInstructionId: ({ isPublic, user, namespace, }: {
        isPublic: boolean;
        user?: {
            name: string;
            id?: string;
        };
        namespace?: string;
    }) => Promise<string | null | undefined>;
    getUuidFromDocId: ({ docId, user, namespace, }: {
        docId: string;
        user?: {
            name: string;
            id?: string;
        };
        namespace?: string;
    }) => Promise<string | undefined>;
    addEntry: ({ entry: { id, ...doc }, user, namespace, }: {
        entry: Omit<KnowledgeBaseEntry, "@timestamp">;
        user?: {
            name: string;
            id?: string;
        };
        namespace: string;
    }) => Promise<void>;
    addBulkEntries: ({ entries, user, namespace, }: {
        entries: Array<Omit<KnowledgeBaseEntry, "@timestamp">>;
        user?: {
            name: string;
            id?: string;
        };
        namespace: string;
    }) => Promise<void>;
    deleteEntry: ({ id }: {
        id: string;
    }) => Promise<void>;
    setupKnowledgeBase: (nextInferenceId: string, waitUntilComplete?: boolean) => Promise<{
        reindex: boolean;
        currentInferenceId: string | undefined;
        nextInferenceId: string;
    }>;
    getModelStatus: () => Promise<{
        enabled: boolean;
        endpoint?: import("@elastic/elasticsearch/lib/api/types").InferenceInferenceEndpointInfo;
        modelStats?: import("@elastic/elasticsearch/lib/api/types").MlTrainedModelStats;
        errorMessage?: string;
        inferenceModelState: import("../../../common/types").InferenceModelState;
        currentInferenceId?: string | undefined;
        concreteWriteIndex: string | undefined;
        isReIndexing: boolean;
        productDocStatus: import("../../../../ai_infra/product_doc_base/common/install_status").InstallationStatus;
    }>;
    getInferenceEndpointsForEmbedding: () => Promise<import("@kbn/ml-trained-models-utils").InferenceAPIConfigResponse[]>;
}
export {};
