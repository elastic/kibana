import * as t from 'io-ts';
import type { InferenceConnector } from '@kbn/inference-common';
export declare const connectorRoutes: {
    "GET /internal/observability_ai_assistant/connectors/{connectorId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/connectors/{connectorId}", t.TypeC<{
        path: t.TypeC<{
            connectorId: t.StringC;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, InferenceConnector, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/connectors": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/connectors", undefined, import("../types").ObservabilityAIAssistantRouteHandlerResources, InferenceConnector[], import("../types").ObservabilityAIAssistantRouteCreateOptions>;
};
