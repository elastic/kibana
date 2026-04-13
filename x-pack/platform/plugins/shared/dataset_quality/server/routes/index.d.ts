import type { EndpointOf, ServerRouteRepository } from '@kbn/server-route-repository';
declare function getTypedDatasetQualityServerRouteRepository(): {
    "GET /internal/dataset_quality/rule_types/degraded_docs/chart_preview": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/rule_types/degraded_docs/chart_preview", import("io-ts").TypeC<{
        query: import("io-ts").TypeC<{
            index: import("io-ts").StringC;
            groupBy: import("io-ts").Type<string[], string, unknown>;
            start: import("io-ts").StringC;
            end: import("io-ts").StringC;
            interval: import("io-ts").StringC;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        series: {
            name: string;
            data: {
                x: number;
                y: number | null;
            }[];
        }[];
        totalGroups: number;
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/integrations/{integration}/dashboards": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/integrations/{integration}/dashboards", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            integration: import("io-ts").StringC;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        dashboards: {
            id: string;
            title: string;
        }[];
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/integrations": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/integrations", undefined, import("./types").DatasetQualityRouteHandlerResources, {
        integrations: import("../../common/api_types").IntegrationType[];
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "PUT /internal/dataset_quality/data_streams/{dataStream}/update_failure_store": import("@kbn/server-route-repository").ServerRoute<"PUT /internal/dataset_quality/data_streams/{dataStream}/update_failure_store", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            dataStream: import("io-ts").StringC;
        }>;
        body: import("io-ts").TypeC<{
            failureStoreEnabled: import("io-ts").BooleanC;
            customRetentionPeriod: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").UndefinedC]>;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        headers: {
            [x: string]: unknown;
        };
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs/errors": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs/errors", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            dataStream: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        errors: {
            message: string;
            type: string;
        }[];
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            dataStream: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        count: number;
        lastOccurrence: number | null | undefined;
        timeSeries: {
            x: number;
            y: number;
        }[];
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/failed_docs": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/failed_docs", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            types: import("io-ts").Type<("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], unknown>;
        }>, import("io-ts").PartialC<{
            datasetQuery: import("io-ts").StringC;
        }>]>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        failedDocs: import("../../common/api_types").DataStreamDocsStat[];
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "POST /internal/dataset_quality/data_streams/{dataStream}/rollover": import("@kbn/server-route-repository").ServerRoute<"POST /internal/dataset_quality/data_streams/{dataStream}/rollover", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            dataStream: import("io-ts").StringC;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        acknowledged: boolean;
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "PUT /internal/dataset_quality/data_streams/{dataStream}/update_field_limit": import("@kbn/server-route-repository").ServerRoute<"PUT /internal/dataset_quality/data_streams/{dataStream}/update_field_limit", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            dataStream: import("io-ts").StringC;
        }>;
        body: import("io-ts").TypeC<{
            newFieldLimit: import("io-ts").NumberC;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        isComponentTemplateUpdated: boolean | undefined;
        isLatestBackingIndexUpdated: boolean | undefined;
        customComponentTemplateName: string;
    } & {
        error?: string | undefined;
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/analyze": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/analyze", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            dataStream: import("io-ts").StringC;
            degradedField: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            lastBackingIndex: import("io-ts").StringC;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        isFieldLimitIssue: boolean;
        fieldCount: number;
        totalFieldLimit: number;
    } & {
        ignoreMalformed?: boolean | undefined;
        nestedFieldLimit?: number | undefined;
        fieldMapping?: {
            type?: string | undefined;
            ignore_above?: number | undefined;
        } | undefined;
        defaultPipeline?: string | undefined;
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/integration/check": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/integration/check", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            dataStream: import("io-ts").StringC;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        isIntegration: false;
        areAssetsAvailable: boolean;
    } | {
        isIntegration: true;
        areAssetsAvailable: true;
        integration: {
            name: string;
        } & {
            title?: string | undefined;
            version?: string | undefined;
            icons?: ({
                src: string;
            } & {
                path?: string | undefined;
                size?: string | undefined;
                title?: string | undefined;
                type?: string | undefined;
            })[] | undefined;
            datasets?: {
                [x: string]: string;
            } | undefined;
        };
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/settings": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/settings", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            dataStream: import("io-ts").StringC;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        lastBackingIndexName?: string | undefined;
        indexTemplate?: string | undefined;
        createdOn?: number | null | undefined;
        integration?: string | undefined;
        datasetUserPrivileges?: {
            datasetsPrivilages: {
                [x: string]: {
                    canMonitor: boolean;
                    canReadFailureStore: boolean;
                    canManageFailureStore: boolean;
                } & {
                    canRead: boolean;
                };
            };
            canViewIntegrations: boolean;
        } | undefined;
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/details": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/details", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            dataStream: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        hasFailureStore?: boolean | undefined;
        lastActivity?: number | undefined;
        degradedDocsCount?: number | undefined;
        failedDocsCount?: number | undefined;
        docsCount?: number | undefined;
        sizeBytes?: number | undefined;
        services?: {
            [x: string]: string[];
        } | undefined;
        hosts?: {
            [x: string]: string[];
        } | undefined;
        userPrivileges?: {
            canMonitor: boolean;
            canReadFailureStore: boolean;
            canManageFailureStore: boolean;
        } | undefined;
        defaultRetentionPeriod?: string | undefined;
        customRetentionPeriod?: string | undefined;
        isServerless?: boolean | undefined;
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/values": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/values", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            dataStream: import("io-ts").StringC;
            degradedField: import("io-ts").StringC;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        field: string;
        values: string[];
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/degraded_fields": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/degraded_fields", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            dataStream: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        degradedFields: ({
            count: number;
            lastOccurrence: number | null | undefined;
            timeSeries: {
                x: number;
                y: number;
            }[];
        } & {
            name: string;
            indexFieldWasLastPresentIn: string;
        })[];
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/non_aggregatable": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/non_aggregatable", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            dataStream: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        aggregatable: boolean;
        datasets: string[];
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/non_aggregatable": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/non_aggregatable", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            types: import("io-ts").Type<("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], unknown>;
        }>, import("io-ts").PartialC<{
            dataStream: import("io-ts").StringC;
        }>]>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        aggregatable: boolean;
        datasets: string[];
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/total_docs": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/total_docs", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            type: import("io-ts").KeyofC<{
                logs: null;
                metrics: null;
                traces: null;
                synthetics: null;
                profiling: null;
            }>;
        }>]>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        totalDocs: import("../../common/api_types").DataStreamDocsStat[];
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/degraded_docs": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/degraded_docs", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            types: import("io-ts").Type<("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], unknown>;
        }>, import("io-ts").PartialC<{
            datasetQuery: import("io-ts").StringC;
        }>]>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        degradedDocs: import("../../common/api_types").DataStreamDocsStat[];
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/stats": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/stats", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").UnionC<[import("io-ts").TypeC<{
            types: import("io-ts").Type<("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], unknown>;
        }>, import("io-ts").TypeC<{
            datasetQuery: import("io-ts").StringC;
        }>]>, import("io-ts").PartialC<{
            includeCreationDate: import("io-ts").Type<boolean, boolean, unknown>;
        }>]>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        datasetUserPrivileges: import("../../common/api_types").DatasetUserPrivileges;
        dataStreamsStats: import("../../common/api_types").DataStreamStat[];
    }, import("./types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/types_privileges": import("@kbn/server-route-repository").ServerRoute<"GET /internal/dataset_quality/data_streams/types_privileges", import("io-ts").TypeC<{
        query: import("io-ts").TypeC<{
            types: import("io-ts").Type<("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], unknown>;
        }>;
    }>, import("./types").DatasetQualityRouteHandlerResources, {
        datasetTypesPrivileges: import("../../common/api_types").DatasetTypesPrivileges;
    }, import("./types").DatasetQualityRouteCreateOptions>;
};
export declare const getDatasetQualityServerRouteRepository: () => ServerRouteRepository;
export type DatasetQualityServerRouteRepository = ReturnType<typeof getTypedDatasetQualityServerRouteRepository>;
export type APIEndpoint = EndpointOf<DatasetQualityServerRouteRepository>;
export {};
