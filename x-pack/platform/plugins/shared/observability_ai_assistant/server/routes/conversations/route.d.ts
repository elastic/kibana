import * as t from 'io-ts';
import type { Conversation } from '../../../common/types';
export declare const conversationRoutes: {
    "PATCH /internal/observability_ai_assistant/conversation/{conversationId}": import("@kbn/server-route-repository-utils").ServerRoute<"PATCH /internal/observability_ai_assistant/conversation/{conversationId}", t.TypeC<{
        path: t.TypeC<{
            conversationId: t.StringC;
        }>;
        body: t.PartialC<{
            public: t.BooleanC;
            archived: t.BooleanC;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, Conversation, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/conversation/{conversationId}/duplicate": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/conversation/{conversationId}/duplicate", t.TypeC<{
        path: t.TypeC<{
            conversationId: t.StringC;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, Conversation, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "DELETE /internal/observability_ai_assistant/conversation/{conversationId}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/observability_ai_assistant/conversation/{conversationId}", t.TypeC<{
        path: t.TypeC<{
            conversationId: t.StringC;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, void, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "PUT /internal/observability_ai_assistant/conversation/{conversationId}": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/observability_ai_assistant/conversation/{conversationId}", t.TypeC<{
        path: t.TypeC<{
            conversationId: t.StringC;
        }>;
        body: t.TypeC<{
            conversation: t.Type<import("../../../common/types").ConversationUpdateRequest, import("../../../common/types").ConversationUpdateRequest, unknown>;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, Conversation, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/conversation": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/conversation", t.TypeC<{
        body: t.TypeC<{
            conversation: t.Type<Omit<Conversation, "namespace" | "user" | "conversation"> & {
                conversation: {
                    title: string;
                    id?: string;
                };
            }, Omit<Conversation, "namespace" | "user" | "conversation"> & {
                conversation: {
                    title: string;
                    id?: string;
                };
            }, unknown>;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, Conversation, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/conversations": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/conversations", t.PartialC<{
        body: t.PartialC<{
            query: t.StringC;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, {
        conversations: Conversation[];
    }, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/conversation/{conversationId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/conversation/{conversationId}", t.TypeC<{
        path: t.TypeC<{
            conversationId: t.StringC;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, Conversation, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
};
