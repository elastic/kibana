export declare const dependenciesRouteDefinitions: {
    topDependencies: {
        endpoint: "GET /internal/apm/dependencies/top_dependencies";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                numBuckets: import("zod").ZodCoercedNumber<unknown>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./top_dependencies").TopDependenciesResponse>;
    topDependenciesStatistics: {
        endpoint: "POST /internal/apm/dependencies/top_dependencies/statistics";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
                numBuckets: import("zod").ZodCoercedNumber<unknown>;
            }, import("zod/v4/core").$strip>;
            body: import("zod").ZodObject<{
                dependencyNames: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./top_dependencies_statistics").DependenciesTimeseriesStatisticsResponse>;
    upstreamServices: {
        endpoint: "GET /internal/apm/dependencies/upstream_services";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                dependencyName: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                numBuckets: import("zod").ZodCoercedNumber<unknown>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
                kuery: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./upstream_services").UpstreamServicesForDependencyResponse>;
    metadata: {
        endpoint: "GET /internal/apm/dependencies/metadata";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                dependencyName: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./metadata").DependencyMetadataRouteResponse>;
    latencyCharts: {
        endpoint: "GET /internal/apm/dependencies/charts/latency";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                dependencyName: import("zod").ZodString;
                spanName: import("zod").ZodString;
                searchServiceDestinationMetrics: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                    true: "true";
                    false: "false";
                }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                kuery: import("zod").ZodString;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./latency_charts").LatencyChartsDependencyResponse>;
    throughputCharts: {
        endpoint: "GET /internal/apm/dependencies/charts/throughput";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                dependencyName: import("zod").ZodString;
                spanName: import("zod").ZodString;
                searchServiceDestinationMetrics: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                    true: "true";
                    false: "false";
                }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                kuery: import("zod").ZodString;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./throughput_charts").ThroughputChartsForDependencyResponse>;
    errorRateCharts: {
        endpoint: "GET /internal/apm/dependencies/charts/error_rate";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                dependencyName: import("zod").ZodString;
                spanName: import("zod").ZodString;
                searchServiceDestinationMetrics: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                    true: "true";
                    false: "false";
                }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                kuery: import("zod").ZodString;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./error_rate_charts").DependencyErrorRateChartsResponse>;
    operations: {
        endpoint: "GET /internal/apm/dependencies/operations";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
                dependencyName: import("zod").ZodString;
                searchServiceDestinationMetrics: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                    true: "true";
                    false: "false";
                }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./operations").DependencyOperationsResponse>;
    latencyDistribution: {
        endpoint: "GET /internal/apm/dependencies/charts/distribution";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                dependencyName: import("zod").ZodString;
                spanName: import("zod").ZodString;
                percentileThreshold: import("zod").ZodCoercedNumber<unknown>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                kuery: import("zod").ZodString;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./latency_distribution").DependencyLatencyDistributionResponse>;
    topDependencySpans: {
        endpoint: "GET /internal/apm/dependencies/operations/spans";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                dependencyName: import("zod").ZodString;
                spanName: import("zod").ZodString;
                sampleRangeFrom: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                sampleRangeTo: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./top_dependency_spans").TopDependencySpansResponse>;
};
export type { TopDependenciesResponse } from './top_dependencies';
export type { DependenciesTimeseriesStatisticsResponse } from './top_dependencies_statistics';
export type { UpstreamServicesForDependencyResponse } from './upstream_services';
export type { MetadataForDependencyResponse, DependencyMetadataRouteResponse } from './metadata';
export type { LatencyChartsDependencyResponse } from './latency_charts';
export type { ThroughputChartsForDependencyResponse } from './throughput_charts';
export type { DependencyErrorRateChartsResponse } from './error_rate_charts';
export type { DependencyOperation, DependencyOperationsResponse } from './operations';
export type { DependencyLatencyDistributionResponse } from './latency_distribution';
export type { DependencySpan, TopDependencySpansResponse } from './top_dependency_spans';
