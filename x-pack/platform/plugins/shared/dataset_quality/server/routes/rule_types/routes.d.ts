import * as t from 'io-ts';
export declare const ruleTypesRouteRepository: {
    "GET /internal/dataset_quality/rule_types/degraded_docs/chart_preview": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/rule_types/degraded_docs/chart_preview", t.TypeC<{
        query: t.TypeC<{
            index: t.StringC;
            groupBy: t.Type<string[], string, unknown>;
            start: t.StringC;
            end: t.StringC;
            interval: t.StringC;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        series: {
            name: string;
            data: {
                x: number;
                y: number | null;
            }[];
        }[];
        totalGroups: number;
    }, import("../types").DatasetQualityRouteCreateOptions>;
};
