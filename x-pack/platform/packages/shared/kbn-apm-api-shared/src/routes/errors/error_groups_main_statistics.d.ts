import { z } from '@kbn/zod/v4';
export interface ErrorGroupMainStatisticsResponse {
    errorGroups: Array<{
        groupId: string;
        name: string;
        lastSeen: number;
        occurrences: number;
        culprit: string | undefined;
        handled: boolean | undefined;
        type: string | undefined;
        traceId: string | undefined;
    }>;
    maxCountExceeded: boolean;
}
export declare const errorsMainStatisticsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/errors/groups/main_statistics";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            sortField: z.ZodOptional<z.ZodString>;
            sortDirection: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"asc">, z.ZodLiteral<"desc">]>>;
            searchQuery: z.ZodOptional<z.ZodString>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ErrorGroupMainStatisticsResponse>;
export declare const errorsMainStatisticsByTransactionNameRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            transactionType: z.ZodString;
            transactionName: z.ZodString;
            maxNumberOfErrorGroups: z.ZodCoercedNumber<unknown>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ErrorGroupMainStatisticsResponse>;
