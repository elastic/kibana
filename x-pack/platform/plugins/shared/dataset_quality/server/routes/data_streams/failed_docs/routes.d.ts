import * as t from 'io-ts';
import type { DataStreamDocsStat } from '../../../../common/api_types';
export declare const failedDocsRouteRepository: {
    "GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs/errors": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs/errors", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../../types").DatasetQualityRouteHandlerResources, {
        errors: {
            message: string;
            type: string;
        }[];
    }, import("../../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../../types").DatasetQualityRouteHandlerResources, {
        count: number;
        lastOccurrence: number | null | undefined;
        timeSeries: {
            x: number;
            y: number;
        }[];
    }, import("../../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/failed_docs": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/failed_docs", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            types: t.Type<("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], unknown>;
        }>, t.PartialC<{
            datasetQuery: t.StringC;
        }>]>;
    }>, import("../../types").DatasetQualityRouteHandlerResources, {
        failedDocs: DataStreamDocsStat[];
    }, import("../../types").DatasetQualityRouteCreateOptions>;
};
