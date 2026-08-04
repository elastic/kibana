import * as t from 'io-ts';
export declare const topLevelRoutes: {
    "POST /internal/observability_ai_assistant/index_assets": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/index_assets", t.TypeC<{
        query: t.TypeC<{
            inference_id: t.StringC;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, void, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
};
