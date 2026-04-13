import * as t from 'io-ts';
import type { DataStreamDocsStat, DataStreamStat, DatasetTypesPrivileges, DatasetUserPrivileges } from '../../../common/api_types';
export declare const dataStreamsRouteRepository: {
    "PUT /internal/dataset_quality/data_streams/{dataStream}/update_failure_store": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/dataset_quality/data_streams/{dataStream}/update_failure_store", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
        }>;
        body: t.TypeC<{
            failureStoreEnabled: t.BooleanC;
            customRetentionPeriod: t.UnionC<[t.StringC, t.UndefinedC]>;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        headers: {
            [x: string]: unknown;
        };
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs/errors": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs/errors", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        errors: {
            message: string;
            type: string;
        }[];
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/failed_docs", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        count: number;
        lastOccurrence: number | null | undefined;
        timeSeries: {
            x: number;
            y: number;
        }[];
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/failed_docs": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/failed_docs", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            types: t.Type<("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], unknown>;
        }>, t.PartialC<{
            datasetQuery: t.StringC;
        }>]>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        failedDocs: DataStreamDocsStat[];
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "POST /internal/dataset_quality/data_streams/{dataStream}/rollover": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/dataset_quality/data_streams/{dataStream}/rollover", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        acknowledged: boolean;
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "PUT /internal/dataset_quality/data_streams/{dataStream}/update_field_limit": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/dataset_quality/data_streams/{dataStream}/update_field_limit", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
        }>;
        body: t.TypeC<{
            newFieldLimit: t.NumberC;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        isComponentTemplateUpdated: boolean | undefined;
        isLatestBackingIndexUpdated: boolean | undefined;
        customComponentTemplateName: string;
    } & {
        error?: string | undefined;
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/analyze": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/analyze", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
            degradedField: t.StringC;
        }>;
        query: t.TypeC<{
            lastBackingIndex: t.StringC;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
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
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/integration/check": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/integration/check", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
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
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/settings": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/settings", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
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
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/details": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/details", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
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
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/values": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/values", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
            degradedField: t.StringC;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        field: string;
        values: string[];
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/degraded_fields": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/degraded_fields", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
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
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/{dataStream}/non_aggregatable": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/{dataStream}/non_aggregatable", t.TypeC<{
        path: t.TypeC<{
            dataStream: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        aggregatable: boolean;
        datasets: string[];
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/non_aggregatable": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/non_aggregatable", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            types: t.Type<("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], unknown>;
        }>, t.PartialC<{
            dataStream: t.StringC;
        }>]>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        aggregatable: boolean;
        datasets: string[];
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/total_docs": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/total_docs", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            type: t.KeyofC<{
                logs: null;
                metrics: null;
                traces: null;
                synthetics: null;
                profiling: null;
            }>;
        }>]>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        totalDocs: DataStreamDocsStat[];
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/degraded_docs": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/degraded_docs", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            types: t.Type<("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], unknown>;
        }>, t.PartialC<{
            datasetQuery: t.StringC;
        }>]>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        degradedDocs: DataStreamDocsStat[];
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/stats": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/stats", t.TypeC<{
        query: t.IntersectionC<[t.UnionC<[t.TypeC<{
            types: t.Type<("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], unknown>;
        }>, t.TypeC<{
            datasetQuery: t.StringC;
        }>]>, t.PartialC<{
            includeCreationDate: t.Type<boolean, boolean, unknown>;
        }>]>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        datasetUserPrivileges: DatasetUserPrivileges;
        dataStreamsStats: DataStreamStat[];
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/data_streams/types_privileges": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/data_streams/types_privileges", t.TypeC<{
        query: t.TypeC<{
            types: t.Type<("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], ("logs" | "metrics" | "traces" | "synthetics" | "profiling")[], unknown>;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        datasetTypesPrivileges: DatasetTypesPrivileges;
    }, import("../types").DatasetQualityRouteCreateOptions>;
};
