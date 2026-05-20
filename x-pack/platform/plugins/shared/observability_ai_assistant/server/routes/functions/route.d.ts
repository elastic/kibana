import * as t from 'io-ts';
import type { FunctionDefinition } from '../../../common/functions/types';
import type { RecalledEntry } from '../../service/knowledge_base_service';
export declare const functionRoutes: {
    "GET /internal/observability_ai_assistant/functions/get_dataset_info": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/functions/get_dataset_info", t.TypeC<{
        query: t.TypeC<{
            index: t.StringC;
            connectorId: t.StringC;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, {
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
    }, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/functions/summarize": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/functions/summarize", t.TypeC<{
        body: t.TypeC<{
            title: t.StringC;
            text: t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
            public: t.Type<boolean, boolean, unknown>;
            labels: t.RecordC<t.StringC, t.StringC>;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, void, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "POST /internal/observability_ai_assistant/functions/recall": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/observability_ai_assistant/functions/recall", t.TypeC<{
        body: t.IntersectionC<[t.TypeC<{
            queries: t.ArrayC<t.IntersectionC<[t.TypeC<{
                text: t.StringC;
            }>, t.PartialC<{
                boost: t.NumberC;
            }>]>>;
        }>, t.PartialC<{
            categories: t.ArrayC<t.StringC>;
        }>]>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, {
        entries: RecalledEntry[];
    }, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
    "GET /internal/observability_ai_assistant/functions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/observability_ai_assistant/functions", t.TypeC<{
        query: t.PartialC<{
            scopes: t.UnionC<[t.ArrayC<t.UnionC<[t.LiteralC<"observability">, t.LiteralC<"search">, t.LiteralC<"all">]>>, t.UnionC<[t.LiteralC<"observability">, t.LiteralC<"search">, t.LiteralC<"all">]>]>;
        }>;
    }>, import("../types").ObservabilityAIAssistantRouteHandlerResources, {
        functionDefinitions: FunctionDefinition[];
        systemMessage: string;
    }, import("../types").ObservabilityAIAssistantRouteCreateOptions>;
};
