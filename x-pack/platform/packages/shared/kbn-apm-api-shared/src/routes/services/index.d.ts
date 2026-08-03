export declare const servicesRouteDefinitions: {
    servicesList: {
        endpoint: "GET /internal/apm/services";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                searchQuery: import("zod").ZodOptional<import("zod").ZodString>;
                serviceGroup: import("zod").ZodOptional<import("zod").ZodString>;
                probability: import("zod").ZodCoercedNumber<unknown>;
                documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                useDurationSummary: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                    true: "true";
                    false: "false";
                }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./services_list").ServicesItemsResponse>;
    detailedStatistics: {
        endpoint: "POST /internal/apm/services/detailed_statistics";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
                probability: import("zod").ZodCoercedNumber<unknown>;
                documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                bucketSizeInSeconds: import("zod").ZodCoercedNumber<unknown>;
            }, import("zod/v4/core").$strip>;
            body: import("zod").ZodObject<{
                serviceNames: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./services_detailed_statistics").ServiceTransactionDetailedStatPeriodsResponse>;
    metadataDetails: {
        endpoint: "GET /internal/apm/services/{serviceName}/metadata/details";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_metadata_details").ServiceMetadataDetails>;
    metadataIcons: {
        endpoint: "GET /internal/apm/services/{serviceName}/metadata/icons";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_metadata_icons").ServiceMetadataIcons>;
    agent: {
        endpoint: "GET /internal/apm/services/{serviceName}/agent";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_agent").ServiceAgentResponse>;
    transactionTypes: {
        endpoint: "GET /internal/apm/services/{serviceName}/transaction_types";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_transaction_types").ServiceTransactionTypesResponse>;
    nodeMetadata: {
        endpoint: "GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
                serviceNodeName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_node_metadata").ServiceNodeMetadataResponse>;
    annotationsSearch: {
        endpoint: "GET /api/apm/services/{serviceName}/annotation/search 2023-10-31";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_annotations_search").ServiceAnnotationResponse>;
    throughput: {
        endpoint: "GET /internal/apm/services/{serviceName}/throughput";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                bucketSizeInSeconds: import("zod").ZodCoercedNumber<unknown>;
                transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                filters: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<import("@kbn/es-query").BoolQuery, string>>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
                documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_throughput").ServiceThroughputRouteResponse>;
    instancesMainStatistics: {
        endpoint: "GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                latencyAggregationType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                transactionType: import("zod").ZodString;
                sortField: import("zod").ZodEnum<{
                    latency: "latency";
                    serviceNodeName: "serviceNodeName";
                    throughput: "throughput";
                    errorRate: "errorRate";
                    cpuUsage: "cpuUsage";
                    memoryUsage: "memoryUsage";
                }>;
                sortDirection: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"asc">, import("zod").ZodLiteral<"desc">]>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_instances_main_statistics").ServiceInstancesMainStatisticsRouteResponse>;
    instancesDetailedStatistics: {
        endpoint: "GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                latencyAggregationType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                transactionType: import("zod").ZodString;
                serviceNodeIds: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
                numBuckets: import("zod").ZodCoercedNumber<unknown>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_instances_detailed_statistics").ServiceInstancesDetailedStatisticsResponse>;
    instancesMetadataDetails: {
        endpoint: "GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
                serviceNodeName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_instances_metadata_details").ServiceInstancesMetadataDetailsRouteResponse>;
    dependencies: {
        endpoint: "GET /internal/apm/services/{serviceName}/dependencies";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                numBuckets: import("zod").ZodCoercedNumber<unknown>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_dependencies").ServiceDependenciesRouteResponse>;
    dependenciesBreakdown: {
        endpoint: "GET /internal/apm/services/{serviceName}/dependencies/breakdown";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                kuery: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_dependencies_breakdown").ServiceDependenciesBreakdownRouteResponse>;
    anomalyCharts: {
        endpoint: "GET /internal/apm/services/{serviceName}/anomaly_charts";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                transactionType: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_anomaly_charts").ServiceAnomalyChartsResponse>;
    alertsCount: {
        endpoint: "GET /internal/apm/services/{serviceName}/alerts_count";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<{
        serviceName: string;
        alertsCount: number;
    }>;
    slos: {
        endpoint: "GET /internal/apm/services/{serviceName}/slos";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                page: import("zod").ZodCoercedNumber<unknown>;
                perPage: import("zod").ZodCoercedNumber<unknown>;
                statusFilters: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>>;
                kqlQuery: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_slos").ServiceSlosResponse>;
    mixedIngestion: {
        endpoint: "GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_mixed_ingestion").ServiceMixedIngestionResponse>;
    anomalyScore: {
        endpoint: "GET /internal/apm/services/{serviceName}/anomaly_score";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_anomaly_score").ServiceAnomalyScoreResponse>;
};
export type { ServicesItemsResponse, MergedServiceStat } from './services_list';
export type { ServiceTransactionDetailedStat, ServiceTransactionDetailedStatPeriodsResponse, } from './services_detailed_statistics';
export type { ServiceMetadataDetails } from './service_metadata_details';
export type { ServiceMetadataIcons } from './service_metadata_icons';
export type { ServiceAgentResponse } from './service_agent';
export type { ServiceTransactionTypesResponse } from './service_transaction_types';
export type { ServiceNodeMetadataResponse } from './service_node_metadata';
export type { ServiceAnnotationResponse } from './service_annotations_search';
export type { ServiceThroughputResponse, ServiceThroughputRouteResponse, } from './service_throughput';
export type { ServiceInstanceMainStatisticsResponse, ServiceInstancesMainStatisticsRouteResponse, } from './service_instances_main_statistics';
export type { ServiceInstancesDetailedStat, ServiceInstancesDetailedStatisticsResponse, } from './service_instances_detailed_statistics';
export type { ServiceInstanceMetadataDetailsResponse, ServiceInstanceContainerMetadataDetails, ServiceInstancesMetadataDetailsRouteResponse, } from './service_instances_metadata_details';
export type { ServiceDependenciesResponse, ServiceDependenciesRouteResponse, } from './service_dependencies';
export type { ServiceDependenciesBreakdownResponse, ServiceDependenciesBreakdownRouteResponse, } from './service_dependencies_breakdown';
export type { ServiceAnomalyChartsResponse } from './service_anomaly_charts';
export type { ServiceAlertsResponse, ServiceAlertsCountRouteResponse, } from './service_alerts_count';
export type { ServiceSlosResponse, StatusCounts } from './service_slos';
export type { ServiceMixedIngestionResponse } from './service_mixed_ingestion';
export type { ServiceAnomalyScoreResponse } from './service_anomaly_score';
