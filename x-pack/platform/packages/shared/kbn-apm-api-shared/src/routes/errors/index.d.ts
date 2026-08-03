export declare const errorsRouteDefinitions: {
    mainStatistics: {
        endpoint: "GET /internal/apm/services/{serviceName}/errors/groups/main_statistics";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                sortField: import("zod").ZodOptional<import("zod").ZodString>;
                sortDirection: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"asc">, import("zod").ZodLiteral<"desc">]>>;
                searchQuery: import("zod").ZodOptional<import("zod").ZodString>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./error_groups_main_statistics").ErrorGroupMainStatisticsResponse>;
    mainStatisticsByTransactionName: {
        endpoint: "GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                transactionType: import("zod").ZodString;
                transactionName: import("zod").ZodString;
                maxNumberOfErrorGroups: import("zod").ZodCoercedNumber<unknown>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./error_groups_main_statistics").ErrorGroupMainStatisticsResponse>;
    detailedStatistics: {
        endpoint: "POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
                numBuckets: import("zod").ZodCoercedNumber<unknown>;
            }, import("zod/v4/core").$strip>;
            body: import("zod").ZodObject<{
                groupIds: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./error_groups_detailed_statistics").ErrorGroupPeriodsResponse>;
    groupSamples: {
        endpoint: "GET /internal/apm/services/{serviceName}/errors/{groupId}/samples";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
                groupId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./error_group_samples").ErrorGroupSampleIdsResponse>;
    sampleDetails: {
        endpoint: "GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
                groupId: import("zod").ZodString;
                errorId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./error_sample_details").ErrorSampleDetailsResponse>;
    distribution: {
        endpoint: "GET /internal/apm/services/{serviceName}/errors/distribution";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                groupId: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                bucketSizeInSeconds: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./error_distribution").ErrorDistributionResponse>;
    topErroneousTransactions: {
        endpoint: "GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
                groupId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
                numBuckets: import("zod").ZodCoercedNumber<unknown>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./top_erroneous_transactions").TopErroneousTransactionsResponse>;
};
export type { ErrorGroupMainStatisticsResponse } from './error_groups_main_statistics';
export type { ErrorGroupDetailedStat, ErrorGroupPeriodsResponse, } from './error_groups_detailed_statistics';
export type { ErrorGroupSampleIdsResponse } from './error_group_samples';
export type { ErrorSampleDetailsResponse } from './error_sample_details';
export type { ErrorDistributionResponse } from './error_distribution';
export type { TopErroneousTransactionsResponse } from './top_erroneous_transactions';
