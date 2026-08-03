export declare const metricsRouteDefinitions: {
    charts: {
        endpoint: "GET /internal/apm/services/{serviceName}/metrics/charts";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                agentName: import("zod").ZodString;
                serviceNodeName: import("zod").ZodOptional<import("zod").ZodString>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./metrics_charts").MetricsChartsResponse>;
    nodes: {
        endpoint: "GET /internal/apm/services/{serviceName}/metrics/nodes";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_nodes").ServiceMetricsNodesRouteResponse>;
    serverlessCharts: {
        endpoint: "GET /internal/apm/services/{serviceName}/metrics/serverless/charts";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                serverlessId: import("zod").ZodOptional<import("zod").ZodString>;
                documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                bucketSizeInSeconds: import("zod").ZodCoercedNumber<unknown>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./serverless_charts").ServerlessMetricsChartsResponse>;
    serverlessActiveInstances: {
        endpoint: "GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                serverlessId: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./serverless_active_instances").ServerlessActiveInstancesResponse>;
    serverlessFunctionsOverview: {
        endpoint: "GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview";
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
    } & import("../types").WithResponse<import("./serverless_functions_overview").ServerlessFunctionsOverviewRouteResponse>;
    serverlessSummary: {
        endpoint: "GET /internal/apm/services/{serviceName}/metrics/serverless/summary";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                serverlessId: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./serverless_summary").ServerlessSummaryResponse>;
};
export type { FetchAndTransformMetrics, GenericMetricsChart, MetricsChartsResponse, } from './metrics_charts';
export type { ServiceNodesResponse, ServiceMetricsNodesRouteResponse } from './service_nodes';
export type { ServerlessMetricsChartsResponse } from './serverless_charts';
export type { ActiveInstanceTimeseries, ActiveInstanceOverview, ServerlessActiveInstancesResponse, } from './serverless_active_instances';
export type { ServerlessFunctionsOverviewResponse, ServerlessFunctionsOverviewRouteResponse, } from './serverless_functions_overview';
export type { AwsLambdaArchitecture, AWSLambdaPriceFactor, ServerlessSummaryResponse, } from './serverless_summary';
