import * as t from 'io-ts';
import type { InferenceInferenceEndpointInfo, MlTrainedModelStats } from '@elastic/elasticsearch/lib/api/types';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import type { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';
import type { Instruction, KnowledgeBaseEntry } from '../../../common/types';
import { KnowledgeBaseEntryRole, InferenceModelState } from '../../../common/types';
export declare const knowledgeBaseRoutes: {
    "POST /internal/observability_ai_assistant/kb/warmup_model": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/kb/warmup_model", t.TypeC<{
        query: t.TypeC<{
            inference_id: t.StringC;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, void, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/kb/inference_endpoints": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/kb/inference_endpoints", undefined, import("../types").ObservabilityAIAssistantRouteHandlerResources, {
        endpoints: InferenceAPIConfigResponse[];
    }, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "DELETE /internal/observability_ai_assistant/kb/entries/{entryId}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/observability_ai_assistant/kb/entries/{entryId}", t.TypeC<{
        path: t.TypeC<{
            entryId: t.StringC;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, void, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/kb/entries/save": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/kb/entries/save", t.TypeC<{
        body: t.IntersectionC<[t.TypeC<{
            id: t.StringC;
            title: t.StringC;
            text: t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
        }>, t.PartialC<{
            public: t.Type<boolean, boolean, unknown>;
            labels: t.RecordC<t.StringC, t.StringC>;
            role: t.UnionC<[t.LiteralC<KnowledgeBaseEntryRole.AssistantSummarization>, t.LiteralC<KnowledgeBaseEntryRole.UserEntry>, t.LiteralC<KnowledgeBaseEntryRole.Elastic>]>;
        }>]>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, void, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/kb/user_instructions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/kb/user_instructions", undefined, import("../types").ObservabilityAIAssistantRouteHandlerResources, {
        userInstructions: Array<Instruction & {
            public?: boolean;
        }>;
    }, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/kb/entries/import": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/kb/entries/import", t.TypeC<{
        body: t.TypeC<{
            entries: t.ArrayC<t.IntersectionC<[t.TypeC<{
                id: t.StringC;
                title: t.StringC;
                text: t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
            }>, t.PartialC<{
                public: t.Type<boolean, boolean, unknown>;
                labels: t.RecordC<t.StringC, t.StringC>;
                role: t.UnionC<[t.LiteralC<KnowledgeBaseEntryRole.AssistantSummarization>, t.LiteralC<KnowledgeBaseEntryRole.UserEntry>, t.LiteralC<KnowledgeBaseEntryRole.Elastic>]>;
            }>]>>;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, void, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "PUT /internal/observability_ai_assistant/kb/user_instructions": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/observability_ai_assistant/kb/user_instructions", t.TypeC<{
        body: t.TypeC<{
            id: t.StringC;
            text: t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
            public: t.Type<boolean, boolean, unknown>;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, void, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/kb/entries": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/kb/entries", t.TypeC<{
        query: t.TypeC<{
            query: t.StringC;
            sortBy: t.StringC;
            sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, {
        entries: KnowledgeBaseEntry[];
    }, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/kb/status": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/kb/status", undefined, import("../types").ObservabilityAIAssistantRouteHandlerResources, {
        errorMessage?: string;
        enabled: boolean;
        endpoint?: InferenceInferenceEndpointInfo;
        modelStats?: Partial<MlTrainedModelStats>;
        inferenceModelState: InferenceModelState;
        currentInferenceId?: string | undefined;
        concreteWriteIndex: string | undefined;
        isReIndexing: boolean;
        productDocStatus: InstallationStatus;
    }, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/kb/reindex": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/kb/reindex", undefined, import("../types").ObservabilityAIAssistantRouteHandlerResources, {
        success: boolean;
    }, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/kb/setup": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/kb/setup", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            inference_id: t.StringC;
        }>, t.PartialC<{
            wait_until_complete: t.Type<boolean, boolean, unknown>;
        }>]>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, {
        reindex: boolean;
        currentInferenceId: string | undefined;
        nextInferenceId: string;
    }, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/kb/migrations/startup": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/kb/migrations/startup", undefined, import("../types").ObservabilityAIAssistantRouteHandlerResources, void, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
};
