export declare const profilingRouteDefinitions: {
    flamegraph: {
        endpoint: "GET /internal/apm/services/{serviceName}/profiling/flamegraph";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                kuery: import("zod").ZodString;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionType: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/profiling-utils").BaseFlameGraph>;
    functions: {
        endpoint: "GET /internal/apm/services/{serviceName}/profiling/functions";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                startIndex: import("zod").ZodCoercedNumber<unknown>;
                endIndex: import("zod").ZodCoercedNumber<unknown>;
                transactionType: import("zod").ZodString;
                kuery: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/profiling-utils").TopNFunctions>;
    status: {
        endpoint: "GET /internal/apm/profiling/status";
        params?: undefined;
    } & import("../types").WithResponse<import("./status").ProfilingStatusResponse>;
    hostsFlamegraph: {
        endpoint: "GET /internal/apm/services/{serviceName}/profiling/hosts/flamegraph";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                kuery: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./hosts_flamegraph").ProfilingHostsFlamegraphResponse>;
    hostsFunctions: {
        endpoint: "GET /internal/apm/services/{serviceName}/profiling/hosts/functions";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                startIndex: import("zod").ZodCoercedNumber<unknown>;
                endIndex: import("zod").ZodCoercedNumber<unknown>;
                kuery: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./hosts_functions").ProfilingHostsFunctionsResponse>;
};
export type { ServicesFlamegraphResponse } from './flamegraph';
export type { ServicesFunctionsResponse } from './functions';
export type { ProfilingStatusResponse } from './status';
export type { ProfilingHostsFlamegraphResponse } from './hosts_flamegraph';
export type { ProfilingHostsFunctionsResponse } from './hosts_functions';
