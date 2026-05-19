import * as t from 'io-ts';
import type { Readable } from 'stream';
import type { ObservabilityAIAssistantRouteHandlerResources } from '../types';
export declare const chatRoutes: {
    "POST /api/observability_ai_assistant/chat/complete 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/observability_ai_assistant/chat/complete 2023-10-31", t.IntersectionC<[t.TypeC<{
        body: t.IntersectionC<[t.TypeC<{
            messages: t.ArrayC<t.Type<import("../../../common/types").Message, import("../../../common/types").Message, unknown>>;
            connectorId: t.StringC;
            persist: t.Type<boolean, boolean, unknown>;
        }>, t.PartialC<{
            isStream: t.UnionC<[t.UndefinedC, t.Type<boolean, boolean, unknown>]>;
            conversationId: t.StringC;
            title: t.StringC;
            disableFunctions: t.Type<boolean, boolean, unknown>;
            instructions: t.ArrayC<t.UnionC<[t.StringC, t.TypeC<{
                id: t.StringC;
                text: t.StringC;
            }>]>>;
        }>]>;
    }>, t.PartialC<{
        body: t.PartialC<{
            actions: t.ArrayC<t.IntersectionC<[t.TypeC<{
                name: t.StringC;
                description: t.StringC;
            }>, t.PartialC<{
                parameters: t.AnyC;
            }>]>>;
        }>;
    }>]>, ObservabilityAIAssistantRouteHandlerResources, import("stream").PassThrough, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/chat/complete": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/chat/complete", t.IntersectionC<[t.TypeC<{
        body: t.IntersectionC<[t.TypeC<{
            messages: t.ArrayC<t.Type<import("../../../common/types").Message, import("../../../common/types").Message, unknown>>;
            connectorId: t.StringC;
            persist: t.Type<boolean, boolean, unknown>;
        }>, t.PartialC<{
            isStream: t.UnionC<[t.UndefinedC, t.Type<boolean, boolean, unknown>]>;
            conversationId: t.StringC;
            title: t.StringC;
            disableFunctions: t.Type<boolean, boolean, unknown>;
            instructions: t.ArrayC<t.UnionC<[t.StringC, t.TypeC<{
                id: t.StringC;
                text: t.StringC;
            }>]>>;
        }>]>;
    }>, t.TypeC<{
        body: t.TypeC<{
            screenContexts: t.ArrayC<t.Type<import("../../../common/types").ObservabilityAIAssistantScreenContextRequest, import("../../../common/types").ObservabilityAIAssistantScreenContextRequest, unknown>>;
            scopes: t.ArrayC<t.UnionC<[t.LiteralC<"observability">, t.LiteralC<"search">, t.LiteralC<"all">]>>;
        }>;
    }>]>, ObservabilityAIAssistantRouteHandlerResources, import("stream").PassThrough | {
        conversationId: string | undefined;
        data: string | undefined;
        connectorId: string;
    }, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/chat/recall": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/chat/recall", t.TypeC<{
        body: t.TypeC<{
            screenDescription: t.StringC;
            connectorId: t.StringC;
            scopes: t.ArrayC<t.UnionC<[t.LiteralC<"observability">, t.LiteralC<"search">, t.LiteralC<"all">]>>;
            messages: t.ArrayC<t.Type<import("../../../common/types").Message, import("../../../common/types").Message, unknown>>;
        }>;
    }>, ObservabilityAIAssistantRouteHandlerResources, Readable, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/chat": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/chat", t.TypeC<{
        body: t.IntersectionC<[t.TypeC<{
            name: t.StringC;
            systemMessage: t.StringC;
            messages: t.ArrayC<t.Type<import("../../../common/types").Message, import("../../../common/types").Message, unknown>>;
            connectorId: t.StringC;
            functions: t.ArrayC<t.IntersectionC<[t.TypeC<{
                name: t.StringC;
                description: t.StringC;
            }>, t.PartialC<{
                parameters: t.AnyC;
            }>]>>;
            scopes: t.ArrayC<t.UnionC<[t.LiteralC<"observability">, t.LiteralC<"search">, t.LiteralC<"all">]>>;
        }>, t.PartialC<{
            functionCall: t.StringC;
        }>]>;
    }>, ObservabilityAIAssistantRouteHandlerResources, Readable, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
};
