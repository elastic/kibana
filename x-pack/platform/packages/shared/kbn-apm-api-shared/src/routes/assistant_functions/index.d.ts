export declare const assistantFunctionsRouteDefinitions: {
    getApmTimeseries: {
        endpoint: "POST /internal/apm/assistant/get_apm_timeseries";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                stats: import("zod").ZodArray<import("zod").ZodObject<{
                    'service.name': import("zod").ZodString;
                    title: import("zod").ZodString;
                    timeseries: import("zod").ZodUnion<readonly [import("zod").ZodObject<{
                        name: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.transactionThroughput>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.transactionFailureRate>]>;
                        'transaction.type': import("zod").ZodOptional<import("zod").ZodString>;
                        'transaction.name': import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                        name: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.exitSpanThroughput>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.exitSpanFailureRate>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.exitSpanLatency>]>;
                        'span.destination.service.resource': import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                        name: import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.transactionLatency>;
                        function: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                        'transaction.type': import("zod").ZodOptional<import("zod").ZodString>;
                        'transaction.name': import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                        name: import("zod").ZodLiteral<import("@kbn/apm-types").ApmTimeseriesType.errorEventRate>;
                    }, import("zod/v4/core").$strip>]>;
                    filter: import("zod").ZodOptional<import("zod").ZodString>;
                    offset: import("zod").ZodOptional<import("zod").ZodString>;
                    'service.environment': import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
                start: import("zod").ZodString;
                end: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./get_apm_timeseries").GetApmTimeseriesResponse>;
    getDownstreamDependencies: {
        endpoint: "GET /internal/apm/assistant/get_downstream_dependencies";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
                start: import("zod").ZodString;
                end: import("zod").ZodString;
                serviceEnvironment: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./get_downstream_dependencies").GetDownstreamDependenciesResponse>;
};
export type { GetApmTimeseriesResponse } from './get_apm_timeseries';
export type { GetDownstreamDependenciesResponse } from './get_downstream_dependencies';
