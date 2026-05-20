import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { CoreSetup, ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Observable } from 'rxjs';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import type { ChatCompleteResponse, InferenceClient, InferenceConnector } from '@kbn/inference-common';
import type { AnalyticsServiceStart } from '@kbn/core/server';
import type { ChatCompletionChunkEvent, ChatCompletionMessageEvent, ChatCompletionErrorEvent } from '../../../common/conversation_complete';
import { type StreamingChatResponseEvent } from '../../../common/conversation_complete';
import type { CompatibleJSONSchema } from '../../../common/functions/types';
import { type Instruction, type Conversation, type ConversationCreateRequest, type ConversationUpdateRequest, type KnowledgeBaseEntry, type Message } from '../../../common/types';
import type { ChatFunctionClient } from '../chat_function_client';
import type { KnowledgeBaseService, RecalledEntry } from '../knowledge_base_service';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import type { ObservabilityAIAssistantConfig } from '../../config';
export declare class ObservabilityAIAssistantClient {
    private readonly dependencies;
    constructor(dependencies: {
        config: ObservabilityAIAssistantConfig;
        core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
        actionsClient: PublicMethodsOf<ActionsClient>;
        uiSettingsClient: IUiSettingsClient;
        namespace: string;
        esClient: {
            asInternalUser: ElasticsearchClient;
            asCurrentUser: ElasticsearchClient;
        };
        getConnectorById: (connectorId: string) => Promise<InferenceConnector>;
        inferenceClient: InferenceClient;
        logger: Logger;
        user?: {
            id?: string;
            name: string;
        };
        knowledgeBaseService: KnowledgeBaseService;
        scopes: AssistantScope[];
        analytics: AnalyticsServiceStart;
    });
    private getConversationWithMetaFields;
    private getConversationUpdateValues;
    private isConversationOwnedByUser;
    get: (conversationId: string) => Promise<Conversation>;
    delete: (conversationId: string) => Promise<void>;
    complete: ({ functionClient, connectorId, simulateFunctionCalling, userInstructions: apiUserInstructions, messages: initialMessages, signal, persist, kibanaPublicUrl, isPublic, title: predefinedTitle, conversationId: predefinedConversationId, disableFunctions, }: {
        messages: Message[];
        connectorId: string;
        signal: AbortSignal;
        functionClient: ChatFunctionClient;
        persist: boolean;
        conversationId?: string;
        title?: string;
        isPublic?: boolean;
        kibanaPublicUrl?: string;
        userInstructions?: Instruction[];
        simulateFunctionCalling?: boolean;
        disableFunctions?: boolean;
    }) => {
        response$: Observable<Exclude<StreamingChatResponseEvent, ChatCompletionErrorEvent>>;
        getConversation: () => Promise<ConversationCreateRequest>;
    };
    chat<TStream extends boolean>(name: string, { systemMessage, messages, connectorId, functions, functionCall, signal, simulateFunctionCalling, stream, }: {
        systemMessage?: string;
        messages: Message[];
        connectorId: string;
        functions?: Array<{
            name: string;
            description: string;
            parameters?: CompatibleJSONSchema;
        }>;
        functionCall?: string;
        signal: AbortSignal;
        simulateFunctionCalling?: boolean;
        stream: TStream;
    }): TStream extends true ? Observable<ChatCompletionChunkEvent | ChatCompletionMessageEvent> : Promise<ChatCompleteResponse>;
    find: (options?: {
        query?: string;
    }) => Promise<Conversation[]>;
    update: (conversationId: string, conversation: ConversationUpdateRequest) => Promise<Conversation>;
    create: (conversation: ConversationCreateRequest) => Promise<Conversation>;
    updatePartial: ({ conversationId, updates, }: {
        conversationId: string;
        updates: Partial<{
            public: boolean;
            archived: boolean;
        }>;
    }) => Promise<Conversation>;
    duplicateConversation: (conversationId: string) => Promise<Conversation>;
    recall: ({ queries, categories, limit, }: {
        queries: Array<{
            text: string;
            boost?: number;
        }>;
        categories?: string[];
        limit?: {
            size?: number;
            tokenCount?: number;
        };
    }) => Promise<RecalledEntry[]>;
    getInferenceEndpointsForEmbedding: () => Promise<import("@kbn/ml-trained-models-utils").InferenceAPIConfigResponse[]>;
    getKnowledgeBaseStatus: () => Promise<{
        enabled: boolean;
        endpoint?: import("@elastic/elasticsearch/lib/api/types").InferenceInferenceEndpointInfo;
        modelStats?: import("@elastic/elasticsearch/lib/api/types").MlTrainedModelStats;
        errorMessage?: string;
        inferenceModelState: import("../../../common").InferenceModelState;
        currentInferenceId?: string | undefined;
        concreteWriteIndex: string | undefined;
        isReIndexing: boolean;
        productDocStatus: import("../../../../ai_infra/product_doc_base/common/install_status").InstallationStatus;
    }>;
    setupKnowledgeBase: (nextInferenceId: string, waitUntilComplete?: boolean) => Promise<{
        reindex: boolean;
        currentInferenceId: string | undefined;
        nextInferenceId: string;
    }>;
    warmupKbModel: (inferenceId: string) => void;
    reIndexKnowledgeBaseWithLock: () => Promise<void>;
    runStartupMigrations: () => Promise<void>;
    addUserInstruction: ({ entry, }: {
        entry: Omit<KnowledgeBaseEntry, "@timestamp" | "type" | "role">;
    }) => Promise<void>;
    addKnowledgeBaseEntry: ({ entry, }: {
        entry: Omit<KnowledgeBaseEntry, "@timestamp" | "type">;
    }) => Promise<void>;
    addKnowledgeBaseBulkEntries: ({ entries, }: {
        entries: Array<Omit<KnowledgeBaseEntry, "@timestamp" | "type">>;
    }) => Promise<void>;
    getKnowledgeBaseEntries: ({ query, sortBy, sortDirection, }: {
        query: string;
        sortBy: string;
        sortDirection: "asc" | "desc";
    }) => Promise<{
        entries: KnowledgeBaseEntry[];
    }>;
    deleteKnowledgeBaseEntry: (id: string) => Promise<void>;
    getKnowledgeBaseUserInstructions: () => Promise<(Instruction & {
        public?: boolean;
    })[]>;
}
