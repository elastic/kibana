export declare function getGlobalObservabilityAIAssistantServerRouteRepository(): {
    "POST /internal/observability_ai_assistant/kb/warmup_model": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/kb/warmup_model", import("io-ts").TypeC<{
        query: import("io-ts").TypeC<{
            inference_id: import("io-ts").StringC;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, void, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/kb/inference_endpoints": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/kb/inference_endpoints", undefined, import("./types").ObservabilityAIAssistantRouteHandlerResources, {
        endpoints: import("@kbn/ml-trained-models-utils").InferenceAPIConfigResponse[];
    }, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "DELETE /internal/observability_ai_assistant/kb/entries/{entryId}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/observability_ai_assistant/kb/entries/{entryId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            entryId: import("io-ts").StringC;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, void, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/kb/entries/save": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/kb/entries/save", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            id: import("io-ts").StringC;
            title: import("io-ts").StringC;
            text: import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
        }>, import("io-ts").PartialC<{
            public: import("io-ts").Type<boolean, boolean, unknown>;
            labels: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").StringC>;
            role: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../common").KnowledgeBaseEntryRole.AssistantSummarization>, import("io-ts").LiteralC<import("../../common").KnowledgeBaseEntryRole.UserEntry>, import("io-ts").LiteralC<import("../../common").KnowledgeBaseEntryRole.Elastic>]>;
        }>]>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, void, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/kb/user_instructions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/kb/user_instructions", undefined, import("./types").ObservabilityAIAssistantRouteHandlerResources, {
        userInstructions: Array<import("../../common/types").Instruction & {
            public?: boolean;
        }>;
    }, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/kb/entries/import": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/kb/entries/import", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            entries: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                id: import("io-ts").StringC;
                title: import("io-ts").StringC;
                text: import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
            }>, import("io-ts").PartialC<{
                public: import("io-ts").Type<boolean, boolean, unknown>;
                labels: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").StringC>;
                role: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../common").KnowledgeBaseEntryRole.AssistantSummarization>, import("io-ts").LiteralC<import("../../common").KnowledgeBaseEntryRole.UserEntry>, import("io-ts").LiteralC<import("../../common").KnowledgeBaseEntryRole.Elastic>]>;
            }>]>>;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, void, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "PUT /internal/observability_ai_assistant/kb/user_instructions": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/observability_ai_assistant/kb/user_instructions", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            id: import("io-ts").StringC;
            text: import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
            public: import("io-ts").Type<boolean, boolean, unknown>;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, void, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/kb/entries": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/kb/entries", import("io-ts").TypeC<{
        query: import("io-ts").TypeC<{
            query: import("io-ts").StringC;
            sortBy: import("io-ts").StringC;
            sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, {
        entries: import("../../common").KnowledgeBaseEntry[];
    }, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/kb/status": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/kb/status", undefined, import("./types").ObservabilityAIAssistantRouteHandlerResources, {
        errorMessage?: string;
        enabled: boolean;
        endpoint?: import("@elastic/elasticsearch/lib/api/types").InferenceInferenceEndpointInfo;
        modelStats?: Partial<import("@elastic/elasticsearch/lib/api/types").MlTrainedModelStats>;
        inferenceModelState: import("../../common").InferenceModelState;
        currentInferenceId?: string | undefined;
        concreteWriteIndex: string | undefined;
        isReIndexing: boolean;
        productDocStatus: import("../../../ai_infra/product_doc_base/common/install_status").InstallationStatus;
    }, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/kb/reindex": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/kb/reindex", undefined, import("./types").ObservabilityAIAssistantRouteHandlerResources, {
        success: boolean;
    }, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/kb/setup": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/kb/setup", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            inference_id: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            wait_until_complete: import("io-ts").Type<boolean, boolean, unknown>;
        }>]>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, {
        reindex: boolean;
        currentInferenceId: string | undefined;
        nextInferenceId: string;
    }, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/kb/migrations/startup": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/kb/migrations/startup", undefined, import("./types").ObservabilityAIAssistantRouteHandlerResources, void, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/functions/get_dataset_info": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/functions/get_dataset_info", import("io-ts").TypeC<{
        query: import("io-ts").TypeC<{
            index: import("io-ts").StringC;
            connectorId: import("io-ts").StringC;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, {
        indices: string[];
        fields: never[];
        stats?: undefined;
    } | {
        indices: string[];
        fields: string[];
        stats: {
            analyzed: number;
            total: number;
        };
    }, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/functions/summarize": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/functions/summarize", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            title: import("io-ts").StringC;
            text: import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
            public: import("io-ts").Type<boolean, boolean, unknown>;
            labels: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").StringC>;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, void, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/functions/recall": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/functions/recall", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            queries: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                text: import("io-ts").StringC;
            }>, import("io-ts").PartialC<{
                boost: import("io-ts").NumberC;
            }>]>>;
        }>, import("io-ts").PartialC<{
            categories: import("io-ts").ArrayC<import("io-ts").StringC>;
        }>]>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, {
        entries: import("../service/knowledge_base_service").RecalledEntry[];
    }, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/functions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/functions", import("io-ts").TypeC<{
        query: import("io-ts").PartialC<{
            scopes: import("io-ts").UnionC<[import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").LiteralC<"observability">, import("io-ts").LiteralC<"search">, import("io-ts").LiteralC<"all">]>>, import("io-ts").UnionC<[import("io-ts").LiteralC<"observability">, import("io-ts").LiteralC<"search">, import("io-ts").LiteralC<"all">]>]>;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, {
        functionDefinitions: import("../../common").FunctionDefinition[];
        systemMessage: string;
    }, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/connectors/{connectorId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/connectors/{connectorId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            connectorId: import("io-ts").StringC;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, import("@kbn/inference-common").InferenceConnector, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/connectors": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/connectors", undefined, import("./types").ObservabilityAIAssistantRouteHandlerResources, import("@kbn/inference-common").InferenceConnector[], import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "PATCH /internal/observability_ai_assistant/conversation/{conversationId}": import("@kbn/server-route-repository-utils").ServerRoute<"PATCH /internal/observability_ai_assistant/conversation/{conversationId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            conversationId: import("io-ts").StringC;
        }>;
        body: import("io-ts").PartialC<{
            public: import("io-ts").BooleanC;
            archived: import("io-ts").BooleanC;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, import("../../common").Conversation, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/conversation/{conversationId}/duplicate": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/conversation/{conversationId}/duplicate", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            conversationId: import("io-ts").StringC;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, import("../../common").Conversation, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "DELETE /internal/observability_ai_assistant/conversation/{conversationId}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/observability_ai_assistant/conversation/{conversationId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            conversationId: import("io-ts").StringC;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, void, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "PUT /internal/observability_ai_assistant/conversation/{conversationId}": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/observability_ai_assistant/conversation/{conversationId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            conversationId: import("io-ts").StringC;
        }>;
        body: import("io-ts").TypeC<{
            conversation: import("io-ts").Type<import("../../common/types").ConversationUpdateRequest, import("../../common/types").ConversationUpdateRequest, unknown>;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, import("../../common").Conversation, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/conversation": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/conversation", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            conversation: import("io-ts").Type<Omit<import("../../common").Conversation, "namespace" | "user" | "conversation"> & {
                conversation: {
                    title: string;
                    id?: string;
                };
            }, Omit<import("../../common").Conversation, "namespace" | "user" | "conversation"> & {
                conversation: {
                    title: string;
                    id?: string;
                };
            }, unknown>;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, import("../../common").Conversation, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/conversations": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/conversations", import("io-ts").PartialC<{
        body: import("io-ts").PartialC<{
            query: import("io-ts").StringC;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, {
        conversations: import("../../common").Conversation[];
    }, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/conversation/{conversationId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/conversation/{conversationId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            conversationId: import("io-ts").StringC;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, import("../../common").Conversation, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /api/observability_ai_assistant/chat/complete 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability_ai_assistant/chat/complete 2023-10-31", import("io-ts").IntersectionC<[import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            messages: import("io-ts").ArrayC<import("io-ts").Type<import("../../common").Message, import("../../common").Message, unknown>>;
            connectorId: import("io-ts").StringC;
            persist: import("io-ts").Type<boolean, boolean, unknown>;
        }>, import("io-ts").PartialC<{
            isStream: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").Type<boolean, boolean, unknown>]>;
            conversationId: import("io-ts").StringC;
            title: import("io-ts").StringC;
            disableFunctions: import("io-ts").Type<boolean, boolean, unknown>;
            instructions: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                id: import("io-ts").StringC;
                text: import("io-ts").StringC;
            }>]>>;
        }>]>;
    }>, import("io-ts").PartialC<{
        body: import("io-ts").PartialC<{
            actions: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                name: import("io-ts").StringC;
                description: import("io-ts").StringC;
            }>, import("io-ts").PartialC<{
                parameters: import("io-ts").AnyC;
            }>]>>;
        }>;
    }>]>, import("./types").ObservabilityAIAssistantRouteHandlerResources, import("stream").PassThrough, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/chat/complete": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/chat/complete", import("io-ts").IntersectionC<[import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            messages: import("io-ts").ArrayC<import("io-ts").Type<import("../../common").Message, import("../../common").Message, unknown>>;
            connectorId: import("io-ts").StringC;
            persist: import("io-ts").Type<boolean, boolean, unknown>;
        }>, import("io-ts").PartialC<{
            isStream: import("io-ts").UnionC<[import("io-ts").UndefinedC, import("io-ts").Type<boolean, boolean, unknown>]>;
            conversationId: import("io-ts").StringC;
            title: import("io-ts").StringC;
            disableFunctions: import("io-ts").Type<boolean, boolean, unknown>;
            instructions: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").TypeC<{
                id: import("io-ts").StringC;
                text: import("io-ts").StringC;
            }>]>>;
        }>]>;
    }>, import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            screenContexts: import("io-ts").ArrayC<import("io-ts").Type<import("../../common/types").ObservabilityAIAssistantScreenContextRequest, import("../../common/types").ObservabilityAIAssistantScreenContextRequest, unknown>>;
            scopes: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").LiteralC<"observability">, import("io-ts").LiteralC<"search">, import("io-ts").LiteralC<"all">]>>;
        }>;
    }>]>, import("./types").ObservabilityAIAssistantRouteHandlerResources, import("stream").PassThrough | {
        conversationId: string | undefined;
        data: string | undefined;
        connectorId: string;
    }, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/chat/recall": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/chat/recall", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            screenDescription: import("io-ts").StringC;
            connectorId: import("io-ts").StringC;
            scopes: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").LiteralC<"observability">, import("io-ts").LiteralC<"search">, import("io-ts").LiteralC<"all">]>>;
            messages: import("io-ts").ArrayC<import("io-ts").Type<import("../../common").Message, import("../../common").Message, unknown>>;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, import("stream").Readable, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/chat": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/chat", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            name: import("io-ts").StringC;
            systemMessage: import("io-ts").StringC;
            messages: import("io-ts").ArrayC<import("io-ts").Type<import("../../common").Message, import("../../common").Message, unknown>>;
            connectorId: import("io-ts").StringC;
            functions: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                name: import("io-ts").StringC;
                description: import("io-ts").StringC;
            }>, import("io-ts").PartialC<{
                parameters: import("io-ts").AnyC;
            }>]>>;
            scopes: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").LiteralC<"observability">, import("io-ts").LiteralC<"search">, import("io-ts").LiteralC<"all">]>>;
        }>, import("io-ts").PartialC<{
            functionCall: import("io-ts").StringC;
        }>]>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, import("stream").Readable, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/index_assets": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/index_assets", import("io-ts").TypeC<{
        query: import("io-ts").TypeC<{
            inference_id: import("io-ts").StringC;
        }>;
    }>, import("./types").ObservabilityAIAssistantRouteHandlerResources, void, import("./types").ObservabilityAIAssistantRouteCreateOptions>;
};
export type ObservabilityAIAssistantServerRouteRepository = ReturnType<typeof getGlobalObservabilityAIAssistantServerRouteRepository>;
