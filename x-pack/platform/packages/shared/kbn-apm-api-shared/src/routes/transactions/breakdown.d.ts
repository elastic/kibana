import { z } from '@kbn/zod/v4';
export interface TransactionBreakdownResponse {
    timeseries: Array<{
        title: string;
        type: string;
        data: Array<{
            x: number;
            y: number | null;
        }>;
        hideLegend: boolean;
        legendValue: any;
    }>;
}
export declare const transactionChartsBreakdownRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/transaction/charts/breakdown";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            transactionType: z.ZodString;
            transactionName: z.ZodOptional<z.ZodString>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<TransactionBreakdownResponse>;
