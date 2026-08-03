import { z } from '@kbn/zod/v4';
import { type PreviewChartResponse } from './types';
export interface ErrorCountChartPreviewResponse {
    errorCountChartPreview: PreviewChartResponse;
}
export declare const errorCountChartPreviewRoute: {
    endpoint: "GET /internal/apm/rule_types/error_count/chart_preview";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            aggregationType: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").AggregationType.Avg>, z.ZodLiteral<import("@kbn/apm-types").AggregationType.P95>, z.ZodLiteral<import("@kbn/apm-types").AggregationType.P99>]>>;
            serviceName: z.ZodOptional<z.ZodString>;
            errorGroupingKey: z.ZodOptional<z.ZodString>;
            transactionType: z.ZodOptional<z.ZodString>;
            transactionName: z.ZodOptional<z.ZodString>;
            interval: z.ZodString;
            groupBy: z.ZodOptional<z.ZodArray<z.ZodString>>;
            searchConfiguration: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<any, string>>, z.ZodObject<{
                query: z.ZodObject<{
                    query: z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodAny>]>;
                    language: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ErrorCountChartPreviewResponse>;
